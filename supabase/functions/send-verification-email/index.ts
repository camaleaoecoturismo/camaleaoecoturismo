import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  email: string;
  nome: string;
  cliente_id?: string;
}

const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, nome, cliente_id }: VerificationRequest = await req.json();

    console.log("Sending verification email to:", email);

    // Generate 6-digit code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Delete any existing codes for this email
    await supabaseAdmin
      .from("email_verification_codes")
      .delete()
      .eq("email", email);

    // Insert new verification code
    const { error: insertError } = await supabaseAdmin
      .from("email_verification_codes")
      .insert({
        email,
        code,
        cliente_id: cliente_id || null,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Error inserting verification code:", insertError);
      throw new Error("Failed to create verification code");
    }

    // Send email via Resend using verified domain
    const emailResponse = await resend.emails.send({
      from: "Camaleão Ecoturismo <noreply@reservas.camaleaoecoturismo.com.br>",
      to: [email],
      subject: "Verifique seu endereço de e-mail",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <h1 style="color: #1a1a2e; font-size: 24px; font-weight: bold; margin: 0 0 24px 0; text-align: center;">
                Verifique seu endereço de e-mail
              </h1>
              
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                Olá, ${nome},
              </p>
              
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Estamos felizes por você ter iniciado o processo de criação da sua conta!
                Para garantir sua segurança e proteger seu acesso, precisamos confirmar seu endereço de e-mail.
              </p>
              
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                Por favor, use o seguinte código de verificação ao criar sua conta ou quando solicitado:
              </p>
              
              <div style="background-color: #f8f8f8; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center;">
                <p style="color: #666; font-size: 14px; margin: 0 0 12px 0; font-weight: 600;">
                  Código de verificação
                </p>
                <p style="color: #c17d31; font-size: 42px; font-weight: bold; margin: 0; letter-spacing: 8px;">
                  ${code}
                </p>
                <p style="color: #888; font-size: 13px; margin: 16px 0 0 0;">
                  Este código expira em 30 minutos
                </p>
              </div>
              
              <div style="background-color: #4a4a4a; border-radius: 6px; padding: 16px; margin-top: 32px;">
                <p style="color: #ffffff; font-size: 13px; line-height: 1.5; margin: 0; text-align: center;">
                  Nós não pedimos em hipótese alguma para compartilhar o código de verificação via canais de suporte, não o envie para ninguém.
                </p>
              </div>
            </div>
            
            <p style="color: #888; font-size: 12px; text-align: center; margin-top: 24px;">
              © Camaleão Ecoturismo | Cadastur: 18.672.459/0001-05
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Resend response:", emailResponse);

    // Check if Resend returned an error
    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      throw new Error(emailResponse.error.message || "Failed to send email");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Verification email sent" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-verification-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
