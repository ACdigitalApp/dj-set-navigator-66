import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeDigits = (value: string) => value.replace(/[^0-9]/g, "");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autenticato" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Sessione non valida" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", authData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Accesso negato" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { action, payload } = body ?? {};

    if (action !== "create-user") {
      return new Response(JSON.stringify({ error: "Azione non supportata" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const displayName = String(payload?.display_name ?? "").trim();
    const email = String(payload?.email ?? "").trim().toLowerCase();
    const password = String(payload?.password ?? "");
    const phone = String(payload?.phone ?? "").trim();
    const whatsapp = String(payload?.whatsapp ?? "").trim();
    const role = payload?.role === "admin" ? "admin" : "user";
    const plan = String(payload?.subscription_plan ?? "free").trim() || "free";

    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: "Email non valida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (password.length < 12) {
      return new Response(JSON.stringify({ error: "Password troppo debole" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (normalizeDigits(phone).length < 8 || normalizeDigits(whatsapp).length < 8) {
      return new Response(JSON.stringify({ error: "Telefono o WhatsApp non validi" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
        email,
        phone,
        whatsapp,
      },
    });

    if (createError || !createdUser.user) {
      return new Response(JSON.stringify({ error: createError?.message ?? "Errore creazione utente" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = createdUser.user.id;

    const { error: profileError } = await supabase.from("profiles").upsert({
      user_id: userId,
      display_name: displayName || email,
      email,
      phone,
      whatsapp,
      plan,
      notification_enabled: false,
      updated_at: new Date().toISOString(),
    } as never, { onConflict: "user_id" });

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (role === "admin") {
      const { error: roleError } = await supabase.from("user_roles").upsert({ user_id: userId, role: "admin" } as never, { onConflict: "user_id,role" });
      if (roleError) {
        return new Response(JSON.stringify({ error: roleError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    return new Response(JSON.stringify({ user_id: userId, email }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Errore interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});