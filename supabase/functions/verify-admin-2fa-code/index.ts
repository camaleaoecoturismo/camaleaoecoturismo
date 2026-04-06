import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyCodeRequest {
  email: string;
  code: string;
  device_fingerprint?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code, device_fingerprint }: VerifyCodeRequest = await req.json();
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: "Email e código são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the verification code (still valid, not yet verified)
    const { data: verificationCode, error: fetchError } = await supabase
      .from('email_verification_codes')
      .select('*')
      .eq('email', email)
      .gt('expires_at', new Date().toISOString())
      .is('verified_at', null)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching verification code:", fetchError);
      return new Response(
        JSON.stringify({ error: "Erro ao verificar código" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!verificationCode) {
      return new Response(
        JSON.stringify({ valid: false, error: "Código inválido ou expirado" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting: max 5 failed attempts before invalidating the code
    const attempts = (verificationCode.attempts ?? 0) as number;
    if (attempts >= 5) {
      await supabase
        .from('email_verification_codes')
        .delete()
        .eq('id', verificationCode.id);

      return new Response(
        JSON.stringify({ valid: false, error: "Muitas tentativas. Solicite um novo código.", too_many_attempts: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Wrong code → increment attempts
    if (verificationCode.code !== code) {
      await supabase
        .from('email_verification_codes')
        .update({ attempts: attempts + 1 })
        .eq('id', verificationCode.id);

      const remaining = 4 - attempts;
      return new Response(
        JSON.stringify({ valid: false, error: `Código incorreto. ${remaining > 0 ? `${remaining} tentativa(s) restante(s).` : 'Último código. Solicite um novo.'}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark code as verified and delete
    await supabase
      .from('email_verification_codes')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', verificationCode.id);

    await supabase
      .from('email_verification_codes')
      .delete()
      .eq('id', verificationCode.id);

    // Look up the user_id for this admin email
    const { data: userData } = await supabase.auth.admin.getUserByEmail(email);
    const userId = userData?.user?.id;

    // Create a 2FA session (1 year) with device fingerprint so Admin.tsx can skip 2FA on same device
    if (userId) {
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

      // Delete existing session for this device (if any) to avoid duplicates
      if (device_fingerprint) {
        await supabase
          .from('admin_2fa_sessions')
          .delete()
          .eq('user_id', userId)
          .eq('device_fingerprint', device_fingerprint);
      }

      const { error: sessionError } = await supabase
        .from('admin_2fa_sessions')
        .insert({
          user_id: userId,
          expires_at: expiresAt,
          device_fingerprint: device_fingerprint ?? null,
          ip_address: ipAddress,
        });

      if (sessionError) {
        console.error("Error creating 2FA session:", sessionError);
      }
    }

    console.log(`2FA code verified for admin: ${email}`);

    return new Response(
      JSON.stringify({ valid: true, message: "Código verificado com sucesso" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in verify-admin-2fa-code:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
