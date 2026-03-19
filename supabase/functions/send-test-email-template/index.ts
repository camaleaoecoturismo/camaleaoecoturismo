import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestEmailRequest {
  template_key: string;
  email: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { template_key, email }: TestEmailRequest = await req.json();
    
    if (!template_key || !email) {
      return new Response(
        JSON.stringify({ success: false, error: "template_key and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending test email for template: ${template_key} to: ${email}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the template
    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("template_key", template_key)
      .single();

    if (templateError || !template) {
      console.error("Template not found:", templateError);
      return new Response(
        JSON.stringify({ success: false, error: "Template not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse variables and replace with examples
    const variables = Array.isArray(template.variables) 
      ? template.variables 
      : JSON.parse(template.variables || '[]');

    let subject = template.subject;
    let bodyHtml = template.body_html;

    for (const v of variables) {
      const regex = new RegExp(`\\{\\{${v.key}\\}\\}`, 'g');
      subject = subject.replace(regex, v.example);
      bodyHtml = bodyHtml.replace(regex, v.example);
    }

    // Send test email
    const result = await resend.emails.send({
      from: "Camaleão Ecoturismo <noreply@reservas.camaleaoecoturismo.com.br>",
      to: [email],
      subject: `[TESTE] ${subject}`,
      html: bodyHtml,
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
        message: `E-mail de teste enviado para ${email}`,
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
