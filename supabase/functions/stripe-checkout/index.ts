import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// DJSEngine Pro price IDs
const PRICES: Record<string, { id: string; amount: number }> = {
  // Launch prices
  monthly:  { id: "price_1TKZ7IEiPZqCo6Zjr2QSttKO", amount: 3.99 },
  annual:   { id: "price_1TKZ9aEiPZqCo6ZjI8RWWe6v", amount: 29.99 },
  // Standard prices (for future use)
  // monthly_std: { id: "price_1TKZAFEiPZqCo6ZjffDqsmQP", amount: 4.99 },
  // annual_std:  { id: "price_1TKZAiEiPZqCo6ZjuSA8NHKb", amount: 39.99 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user from auth header
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // === CREATE CHECKOUT SESSION ===
    if (action === "checkout") {
      const { plan, origin_url } = body;
      const price = PRICES[plan];
      if (!price) {
        return new Response(JSON.stringify({ error: "Invalid plan" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: price.id, quantity: 1 }],
        success_url: `${origin_url}?stripe_session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin_url}?payment_cancelled=true`,
        customer_email: user.email,
        client_reference_id: user.id,
        metadata: {
          user_id: user.id,
          user_email: user.email || "",
          plan,
          app: "djsengine",
          app_key: "djsengine",
          source: "djsengine.it",
        },
        subscription_data: {
          metadata: {
            user_id: user.id,
            user_email: user.email || "",
            plan,
            app: "djsengine",
            app_key: "djsengine",
            source: "djsengine.it",
          },
        },
      });

      return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === CHECK PAYMENT STATUS ===
    if (action === "status") {
      const { session_id } = body;
      if (!session_id) {
        return new Response(JSON.stringify({ error: "Missing session_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const session = await stripe.checkout.sessions.retrieve(session_id);

      if (session.payment_status === "paid") {
        // Best-effort frontend-driven activation; the source of truth is stripe-webhook.
        await supabase.from("profiles").update({
          plan: "pro",
          subscription_status: "active",
          updated_at: new Date().toISOString(),
        }).eq("user_id", user.id);

        return new Response(JSON.stringify({
          status: "complete",
          payment_status: "paid",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        status: session.status,
        payment_status: session.payment_status,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("Stripe error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
