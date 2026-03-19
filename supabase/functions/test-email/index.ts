import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    
    // Email de teste - usando o email verificado no Resend
    const testEmail = email || "camaleaoecoturismo@gmail.com";
    
    console.log("Sending test email to:", testEmail);

    const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #820AD1 0%, #6B08A8 100%); padding: 40px; text-align: center;">
              <h1 style="color: white; margin: 0 0 8px 0; font-size: 28px;">🦎 Teste de Email</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">Camaleão Ecoturismo</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #333; margin: 0 0 16px 0;">✅ Email funcionando!</h2>
              <p style="color: #666; line-height: 1.6;">
                Este é um email de teste para confirmar que a integração com o Resend está funcionando corretamente.
              </p>
              <p style="color: #666; line-height: 1.6;">
                <strong>Próximos passos:</strong>
              </p>
              <ul style="color: #666; line-height: 1.8;">
                <li>Verifique seu domínio em <a href="https://resend.com/domains" style="color: #820AD1;">resend.com/domains</a></li>
                <li>Adicione registros DNS conforme instruções</li>
                <li>Após verificação, poderá enviar emails para qualquer destinatário</li>
              </ul>
              
              <div style="margin-top: 30px; padding: 20px; background: #f8f0ff; border-radius: 12px; border-left: 4px solid #820AD1;">
                <p style="margin: 0; color: #820AD1; font-weight: 600;">
                  ⚠️ Modo Sandbox Ativo
                </p>
                <p style="margin: 8px 0 0 0; color: #666; font-size: 14px;">
                  Enquanto o domínio não for verificado, emails só podem ser enviados para: ${testEmail}
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #820AD1; padding: 30px; text-align: center;">
              <p style="color: white; margin: 0; font-size: 16px; font-weight: 600;">
                Camaleão Ecoturismo
              </p>
              <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0 0; font-size: 13px;">
                Transformando cada viagem em uma aventura inesquecível
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const result = await resend.emails.send({
      from: "Camaleão Ecoturismo <noreply@reservas.camaleaoecoturismo.com.br>",
      to: [testEmail],
      subject: "🦎 Teste de Email - Camaleão Ecoturismo",
      html: emailHTML,
    });

    console.log("Resend response:", JSON.stringify(result, null, 2));

    if (result.error) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.error.message,
          details: result.error
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Email de teste enviado para ${testEmail}`,
        email_id: result.data?.id
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
