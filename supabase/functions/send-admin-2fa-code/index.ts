import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const REST = `${SUPABASE_URL}/rest/v1`;
  const dbHeaders = {
    "apikey": SERVICE_KEY,
    "Authorization": `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  };

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return json({ error: "Serviço de email não configurado" }, 500);
  }

  try {
    const body = await req.json();
    const email: string = body.email ?? "";
    const user_id: string = body.user_id ?? "";

    if (!email || !user_id) {
      return json({ error: "Email e user_id são obrigatórios" }, 400);
    }

    // ── 1. Verify user has admin or staff role ────────────────────────────────
    const roleRes = await fetch(
      `${REST}/user_roles?user_id=eq.${user_id}&role=in.(admin,staff)&limit=1`,
      { headers: dbHeaders }
    );

    if (!roleRes.ok) {
      console.error("DB error fetching role:", await roleRes.text());
      return json({ error: "Erro ao verificar permissão" }, 500);
    }

    const roleRows = await roleRes.json();
    if (!roleRows || roleRows.length === 0) {
      return json({ error: "Acesso não autorizado" }, 403);
    }

    // ── 2. Generate code ──────────────────────────────────────────────────────
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // ── 3. Delete existing codes for this email ───────────────────────────────
    await fetch(
      `${REST}/email_verification_codes?email=eq.${encodeURIComponent(email)}`,
      { method: "DELETE", headers: dbHeaders }
    );

    // ── 4. Insert new code ────────────────────────────────────────────────────
    const insertRes = await fetch(`${REST}/email_verification_codes`, {
      method: "POST",
      headers: dbHeaders,
      body: JSON.stringify({ email, code, expires_at: expiresAt, cliente_id: null }),
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      console.error("Error inserting verification code:", errText);
      return json({ error: "Erro ao gerar código de verificação" }, 500);
    }

    // ── 5. Send email via Resend ──────────────────────────────────────────────
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Camaleão Ecoturismo <noreply@reservas.camaleaoecoturismo.com.br>",
        to: [email],
        subject: "🔐 Código de Verificação - Painel Admin",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f4f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <tr>
                      <td style="background: linear-gradient(135deg, #7C12D1 0%, #9333ea 100%); padding: 32px 24px; text-align: center;">
                        <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 600;">🔐 Verificação de Segurança</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 32px 24px;">
                        <p style="color: #374151; font-size: 16px; margin: 0 0 24px 0; line-height: 1.6;">
                          Olá! Identificamos uma tentativa de login no <strong>Painel Administrativo</strong> da Camaleão Ecoturismo.
                        </p>
                        <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px 0;">
                          Use o código abaixo para confirmar sua identidade:
                        </p>
                        <div style="background-color: #f3f4f6; border: 2px dashed #7C12D1; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                          <span style="font-size: 36px; font-weight: 700; color: #7C12D1; letter-spacing: 8px; font-family: monospace;">${code}</span>
                        </div>
                        <p style="color: #ef4444; font-size: 13px; margin: 24px 0 0 0; text-align: center;">
                          ⏱️ Este código expira em <strong>10 minutos</strong>
                        </p>
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                        <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
                          Se você não tentou fazer login, ignore este email ou entre em contato conosco.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="background-color: #f9fafb; padding: 16px 24px; text-align: center;">
                        <p style="color: #9ca3af; font-size: 11px; margin: 0;">
                          © ${new Date().getFullYear()} Camaleão Ecoturismo. Todos os direitos reservados.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Resend API error:", errorText);
      return json({ error: "Erro ao enviar email de verificação" }, 500);
    }

    console.log(`2FA code sent to: ${email}`);
    return json({ success: true, message: "Código enviado para seu email" });

  } catch (err) {
    console.error("Unexpected error in send-admin-2fa-code:", err);
    return json({ error: "Erro interno do servidor" }, 500);
  }
});
