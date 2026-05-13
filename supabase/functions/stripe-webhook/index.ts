import Stripe from "npm:stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// DJSEngine app filter
const APP_KEY = "djsengine";
const DJSENGINE_PRICE_IDS = new Set([
  "price_1TKZ7IEiPZqCo6Zjr2QSttKO", // monthly
  "price_1TKZ9aEiPZqCo6ZjI8RWWe6v", // annual
  // Standard prices (reserved)
  "price_1TKZAFEiPZqCo6ZjffDqsmQP",
  "price_1TKZAiEiPZqCo6ZjuSA8NHKb",
]);
const FOREIGN_PRICE_IDS = new Set([
  "price_1TWYvzEiPZqCo6ZjWquggJqo", // Speak
  "price_1TWZ0QEiPZqCo6Zjc29JoXdo", // Speak
]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function pickPriceIds(obj: any): string[] {
  const ids: string[] = [];
  const items = obj?.items?.data || obj?.lines?.data || [];
  for (const it of items) {
    const pid = it?.price?.id || it?.plan?.id;
    if (pid) ids.push(pid);
  }
  if (obj?.price?.id) ids.push(obj.price.id);
  return ids;
}

function isDJSEngineEvent(event: Stripe.Event): { ok: boolean; foreign: boolean } {
  const obj: any = event.data.object;
  const meta = obj?.metadata || {};
  const subMeta = obj?.subscription_details?.metadata || {};

  // Strong signal A: metadata.app / app_key
  const appTag = meta.app || meta.app_key || subMeta.app || subMeta.app_key;
  if (appTag === APP_KEY) return { ok: true, foreign: false };

  // Strong signal B: price_id whitelist
  const priceIds = pickPriceIds(obj);
  if (priceIds.some((p) => DJSENGINE_PRICE_IDS.has(p))) {
    return { ok: true, foreign: false };
  }
  if (priceIds.some((p) => FOREIGN_PRICE_IDS.has(p))) {
    return { ok: false, foreign: true };
  }
  // For checkout.session.completed without inline price, check line_items via metadata.app already handled above.

  // Foreign tag explicitly
  if (appTag && appTag !== APP_KEY) return { ok: false, foreign: true };

  return { ok: false, foreign: false };
}

function planFromPriceId(priceId: string | null | undefined): string | null {
  if (!priceId) return null;
  if (priceId === "price_1TKZ7IEiPZqCo6Zjr2QSttKO") return "monthly";
  if (priceId === "price_1TKZ9aEiPZqCo6ZjI8RWWe6v") return "annual";
  return null;
}

const ACTIVE_STATUSES = new Set(["active", "trialing"]);
const INACTIVE_STATUSES = new Set(["canceled", "unpaid", "incomplete_expired"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!stripeKey || !webhookSecret) {
    console.error("Stripe webhook misconfigured: missing secrets");
    return new Response(JSON.stringify({ error: "misconfigured" }), { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const sig = req.headers.get("stripe-signature");
  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig!, webhookSecret);
  } catch (err) {
    console.error("Signature verification failed:", (err as Error).message);
    return new Response(JSON.stringify({ error: "invalid signature" }), { status: 400 });
  }

  // Idempotency: skip if already processed successfully
  const { data: existing } = await supabase
    .from("stripe_webhook_events")
    .select("event_id, status")
    .eq("event_id", event.id)
    .maybeSingle();
  if (existing && existing.status === "processed") {
    return new Response(JSON.stringify({ received: true, idempotent: true }), { status: 200 });
  }

  // Insert/upsert event log row
  await supabase.from("stripe_webhook_events").upsert({
    event_id: event.id,
    type: event.type,
    status: "received",
  }, { onConflict: "event_id" });

  // App filter
  const filter = isDJSEngineEvent(event);
  if (!filter.ok) {
    const status = filter.foreign ? "skipped_foreign_app" : "skipped_unknown_app";
    await supabase.from("stripe_webhook_events").update({
      status,
      app_key: filter.foreign ? "foreign" : "unknown",
      processed_at: new Date().toISOString(),
    }).eq("event_id", event.id);
    console.log(`[skipped] ${event.type} -> ${status}`);
    return new Response(JSON.stringify({ received: true, skipped: status }), { status: 200 });
  }

  // Process the event
  try {
    await handleEvent(event, stripe, supabase);
    await supabase.from("stripe_webhook_events").update({
      status: "processed",
      app_key: APP_KEY,
      processed_at: new Date().toISOString(),
    }).eq("event_id", event.id);
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    const msg = (err as Error).message;
    console.error(`[error] ${event.type}: ${msg}`);
    await supabase.from("stripe_webhook_events").update({
      status: "failed",
      app_key: APP_KEY,
      error: msg,
      processed_at: new Date().toISOString(),
    }).eq("event_id", event.id);
    // Return 200 to avoid Stripe retries on permanent errors; logs preserve evidence.
    return new Response(JSON.stringify({ received: true, error: msg }), { status: 200 });
  }
});

async function handleEvent(event: Stripe.Event, stripe: Stripe, supabase: any) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") return;
      const userId = session.metadata?.user_id || session.client_reference_id;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (!userId || !subscriptionId) return;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await applySubscription(supabase, userId, subscription, customerId);
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.user_id;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
      if (!userId) {
        // Fallback: lookup by stripe_subscription_id
        const { data } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("stripe_subscription_id", sub.id)
          .maybeSingle();
        if (!data?.user_id) {
          console.warn(`No user mapping for subscription ${sub.id}`);
          return;
        }
        await applySubscription(supabase, data.user_id, sub, customerId);
        return;
      }
      await applySubscription(supabase, userId, sub, customerId);
      return;
    }
    case "invoice.paid": {
      const inv = event.data.object as Stripe.Invoice;
      // amount_paid = 0 -> trial / no money collected; do not promote based on payment
      if (!inv.amount_paid || inv.amount_paid <= 0) {
        console.log(`invoice.paid amount=0 (trial?) ignored for billing promotion`);
        return;
      }
      const subId = typeof inv.subscription === "string" ? inv.subscription : inv.subscription?.id;
      if (!subId) return;
      const sub = await stripe.subscriptions.retrieve(subId);
      const userId = sub.metadata?.user_id;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
      if (!userId) return;
      await applySubscription(supabase, userId, sub, customerId);
      return;
    }
    case "invoice.payment_failed": {
      const inv = event.data.object as Stripe.Invoice;
      const subId = typeof inv.subscription === "string" ? inv.subscription : inv.subscription?.id;
      if (!subId) return;
      const sub = await stripe.subscriptions.retrieve(subId);
      const userId = sub.metadata?.user_id;
      if (!userId) return;
      await supabase.from("profiles").update({
        subscription_status: sub.status,
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId);
      return;
    }
  }
}

async function applySubscription(
  supabase: any,
  userId: string,
  sub: Stripe.Subscription,
  customerId: string | null | undefined,
) {
  const isPro = ACTIVE_STATUSES.has(sub.status);
  const isOff = INACTIVE_STATUSES.has(sub.status);
  const update: Record<string, unknown> = {
    subscription_status: sub.status,
    stripe_subscription_id: sub.id,
    current_period_end: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  };
  if (customerId) update.stripe_customer_id = customerId;
  if (isPro) update.plan = "pro";
  else if (isOff) update.plan = "free";
  // past_due: keep current plan, only update status

  const { error } = await supabase.from("profiles").update(update).eq("user_id", userId);
  if (error) throw new Error(`profile update failed: ${error.message}`);
  console.log(`[profile] user=${userId} status=${sub.status} plan=${update.plan ?? "(unchanged)"}`);
}