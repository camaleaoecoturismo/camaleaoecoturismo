import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TriggerEmailRequest {
  trigger_event: string;
  data: Record<string, any>;
  to_email: string;
}

// Replace template variables
function replaceTemplateVariables(template: string, data: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
  }
  return result;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { trigger_event, data, to_email }: TriggerEmailRequest = await req.json();
    
    if (!trigger_event || !to_email) {
      console.error('Missing required fields: trigger_event or to_email');
      return new Response(
        JSON.stringify({ success: false, error: "trigger_event and to_email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Triggering email for event: ${trigger_event} to: ${to_email}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch email template by trigger_event
    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("trigger_event", trigger_event)
      .eq("is_active", true)
      .single();

    if (templateError || !template) {
      console.error(`Email template not found for trigger: ${trigger_event}`, templateError);
      return new Response(
        JSON.stringify({ success: false, error: `Email template not found for trigger: ${trigger_event}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Using template: ${template.name} (${template.template_key})`);

    // Prepare data as string values for template replacement
    const templateData: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined) {
        templateData[key] = String(value);
      }
    }

    // Replace variables in subject and body
    const emailSubject = replaceTemplateVariables(template.subject, templateData);
    const emailBody = replaceTemplateVariables(template.body_html, templateData);

    // Send email
    console.log(`Sending email: ${emailSubject}`);
    
    const result = await resend.emails.send({
      from: "Camaleão Ecoturismo <noreply@reservas.camaleaoecoturismo.com.br>",
      to: [to_email],
      subject: emailSubject,
      html: emailBody,
    });

    console.log("Resend response:", JSON.stringify(result, null, 2));

    if (result.error) {
      console.error("Resend error:", result.error);
      return new Response(
        JSON.stringify({ success: false, error: result.error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update template send count and last_sent_at
    await supabase
      .from("email_templates")
      .update({ 
        send_count: (template.send_count || 0) + 1,
        last_sent_at: new Date().toISOString()
      })
      .eq("id", template.id);

    console.log(`Email sent successfully for trigger: ${trigger_event}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email sent",
        email_id: result.data?.id,
        template_used: template.template_key
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
};

serve(handler);
