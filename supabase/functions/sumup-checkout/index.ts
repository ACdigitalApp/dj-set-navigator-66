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
        if (insErr) return json({ status: "paid", already_processed: true });

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
