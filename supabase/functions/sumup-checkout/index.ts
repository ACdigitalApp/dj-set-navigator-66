import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLANS: Record<string, { amount: number; days: number; label: string }> = {
  monthly: { amount: 3.99, days: 31, label: "DJSEngine Pro mensile" },
  annual: { amount: 29.99, days: 366, label: "DJSEngine Pro annuale" },
};

const API = "https://api.sumup.com/v0.1";


const INGEST_URL = "https://svvvcitnoemgopoinlzp.supabase.co/functions/v1/ingest-payment";
const APP_KEY = "djsengine";

async function hmacHex(secret: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Deliver a confirmed payment to AC Digital App; max 3 attempts in total (tracked in DB).
async function deliverToCentral(supabase: any, checkoutId: string, email: string | null) {
  const secret = Deno.env.get("AC_DIGITAL_INGEST_SECRET");
  const { data: row } = await supabase.from("sumup_payments").select("*").eq("checkout_id", checkoutId).maybeSingle();
  if (!row || row.ingest_status === "delivered" || row.ingest_attempts >= 3) return;
  if (!secret) {
    await supabase.from("sumup_payments").update({ ingest_error: "missing_secret" }).eq("checkout_id", checkoutId);
    return;
  }
  const payload = JSON.stringify({
    app_key: APP_KEY,
    provider: "sumup",
    reference: checkoutId,
    amount_cents: Math.round(Number(row.amount) * 100),
    currency: "EUR",
    status: "paid",
    plan: row.plan,
    paid_at: new Date(row.paid_at).toISOString(),
    email_status: "not_sent", // DJ'S Engine has no payment confirmation email system
  });
  let attempts = row.ingest_attempts;
  while (attempts < 3) {
    attempts++;
    let ok = false, err = "";
    try {
      const ts = String(Date.now());
      const r = await fetch(INGEST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-app-key": APP_KEY, "x-timestamp": ts, "x-signature": await hmacHex(secret, `${ts}.${payload}`) },
        body: payload,
      });
      const txt = await r.text();
      try { ok = JSON.parse(txt)?.ok === true; } catch { /* not json */ }
      if (!ok) err = `HTTP ${r.status}: ${txt.slice(0, 300)}`;
    } catch (e) { err = (e as Error).message; }
    await supabase.from("sumup_payments").update({
      ingest_attempts: attempts,
      ingest_status: ok ? "delivered" : (attempts >= 3 ? "failed" : "retrying"),
      ingest_error: ok ? null : err,
      ingest_delivered_at: ok ? new Date().toISOString() : null,
    }).eq("checkout_id", checkoutId);
    if (ok) return;
    if (attempts < 3) await new Promise((res) => setTimeout(res, 1000 * attempts));
  }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("SUMUP_API_KEY");
    const merchantCode = Deno.env.get("SUMUP_MERCHANT_CODE");
    if (!apiKey || !merchantCode) return json({ error: "SumUp non configurato" }, 500);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return json({ error: "Non autenticato" }, 401);

    const body = await req.json();
    const sumupHeaders = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };

    if (body.action === "checkout") {
      const plan = PLANS[body.plan];
      if (!plan) return json({ error: "Piano non valido" }, 400);
      const reference = `djs_${user.id}_${body.plan}_${Date.now()}`;
      const r = await fetch(`${API}/checkouts`, {
        method: "POST",
        headers: sumupHeaders,
        body: JSON.stringify({
          checkout_reference: reference,
          amount: plan.amount,
          currency: "EUR",
          merchant_code: merchantCode,
          description: plan.label,
          redirect_url: `${body.origin_url}?sumup_plan=${body.plan}`,
          hosted_checkout: { enabled: true },
        }),
      });
      const data = await r.json();
      if (!r.ok || !data.hosted_checkout_url) {
        console.error("SumUp checkout error:", data);
        return json({ error: data?.message || "Errore SumUp" }, 500);
      }
      return json({ url: data.hosted_checkout_url, checkout_id: data.id });
    }

    if (body.action === "status") {
      if (!body.checkout_id) return json({ error: "checkout_id mancante" }, 400);
      const r = await fetch(`${API}/checkouts/${body.checkout_id}`, { headers: sumupHeaders });
      const data = await r.json();
      if (!r.ok) return json({ error: data?.message || "Errore SumUp" }, 500);
      // Ownership check via reference
      if (!String(data.checkout_reference || "").startsWith(`djs_${user.id}_`)) {
        return json({ error: "Checkout non valido" }, 403);
      }
      if (data.status === "PAID") {
        const planKey = String(data.checkout_reference).split("_")[2];
        const plan = PLANS[planKey];
        if (!plan || Number(data.amount) < plan.amount || data.currency !== "EUR") {
          return json({ error: "Pagamento non conforme" }, 400);
        }
        // Idempotency: credit each SumUp checkout only once
        const { error: insErr } = await supabase.from("sumup_payments").insert({
          checkout_id: data.id, user_id: user.id, plan: planKey, amount: Number(data.amount),
        });
        if (insErr) {
          await deliverToCentral(supabase, data.id, user.email ?? null);
          return json({ status: "paid", already_processed: true });
        }

        const { data: prof } = await supabase.from("profiles")
          .select("current_period_end").eq("user_id", user.id).maybeSingle();
        const currentEnd = prof?.current_period_end ? new Date(prof.current_period_end).getTime() : 0;
        const base = Math.max(Date.now(), currentEnd);
        await supabase.from("profiles").update({
          plan: "pro",
          subscription_status: "active",
          current_period_end: new Date(base + plan.days * 86400000).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("user_id", user.id);
        await deliverToCentral(supabase, data.id, user.email ?? null);
        return json({ status: "paid" });
      }
      return json({ status: data.status === "FAILED" ? "failed" : "pending" });
    }

    return json({ error: "Azione sconosciuta" }, 400);
  } catch (err) {
    console.error("sumup-checkout error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
