/**
 * Links an existing PIN-based profile to Supabase Auth (email + password).
 * Verifies PIN server-side; creates auth.users row; sets profiles.auth_user_id.
 *
 * Deploy: supabase functions deploy link-profile-auth --no-verify-jwt
 * (Or enable JWT if you prefer + pass session after partial auth.)
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto in Supabase hosted)
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function isStrongPassword(password: string): { ok: boolean; message?: string } {
  if (password.length < 10) {
    return { ok: false, message: "Password must be at least 10 characters." };
  }
  if (!/[A-Z]/.test(password)) {
    return { ok: false, message: "Include at least one uppercase letter." };
  }
  if (!/[a-z]/.test(password)) {
    return { ok: false, message: "Include at least one lowercase letter." };
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, message: "Include at least one number." };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { ok: false, message: "Include at least one symbol." };
  }
  return { ok: true };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const profile_id = String(body.profile_id ?? "").trim();
    const phone_number = String(body.phone_number ?? "").trim();
    const pin = String(body.pin ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!profile_id || !phone_number || !pin || !email || !password) {
      return new Response(
        JSON.stringify({ error: "Missing profile_id, phone_number, pin, email, or password." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!/^\d{4}$/.test(pin)) {
      return new Response(JSON.stringify({ error: "PIN must be exactly 4 digits." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!EMAIL_RE.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email address." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pw = isStrongPassword(password);
    if (!pw.ok) {
      return new Response(JSON.stringify({ error: pw.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: profile, error: loadErr } = await admin
      .from("profiles")
      .select("id, phone_number, pin, email, auth_user_id")
      .eq("id", profile_id)
      .eq("phone_number", phone_number)
      .maybeSingle();

    if (loadErr || !profile) {
      return new Response(JSON.stringify({ error: "Account not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.pin !== pin) {
      return new Response(JSON.stringify({ error: "Incorrect PIN." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.auth_user_id) {
      return new Response(JSON.stringify({ error: "This account is already migrated." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { profile_id: profile.id },
    });

    if (createErr || !created?.user?.id) {
      const msg = createErr?.message ?? "Could not create auth user.";
      const status = msg.includes("already been registered") ? 409 : 500;
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authUserId = created.user.id;

    const { error: upErr } = await admin
      .from("profiles")
      .update({
        auth_user_id: authUserId,
        password_migrated_at: new Date().toISOString(),
        email,
      })
      .eq("id", profile_id)
      .is("auth_user_id", null);

    if (upErr) {
      console.error("Profile link failed after auth user created:", upErr);
      try {
        await admin.auth.admin.deleteUser(authUserId);
      } catch (_) {
        /* best-effort rollback */
      }
      return new Response(JSON.stringify({ error: "Failed to link profile. Try again or contact support." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, auth_user_id: authUserId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("link-profile-auth error:", e);
    return new Response(JSON.stringify({ error: "Unexpected server error." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
