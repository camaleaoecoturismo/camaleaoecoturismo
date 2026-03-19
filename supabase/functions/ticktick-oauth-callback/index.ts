import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // user_id passed as state
    
    if (!code) {
      return new Response('Authorization code missing', { status: 400 });
    }

    const TICKTICK_CLIENT_ID = Deno.env.get('TICKTICK_CLIENT_ID');
    const TICKTICK_CLIENT_SECRET = Deno.env.get('TICKTICK_CLIENT_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!TICKTICK_CLIENT_ID || !TICKTICK_CLIENT_SECRET) {
      console.error('TickTick credentials not configured');
      return new Response('TickTick credentials not configured', { status: 500 });
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://ticktick.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${TICKTICK_CLIENT_ID}:${TICKTICK_CLIENT_SECRET}`)}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        scope: 'tasks:read tasks:write',
        redirect_uri: `${SUPABASE_URL}/functions/v1/ticktick-oauth-callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return new Response(`Token exchange failed: ${errorText}`, { status: 400 });
    }

    const tokenData = await tokenResponse.json();
    console.log('Token received successfully');

    // Store tokens in database
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Store or update the integration record
    const { error: upsertError } = await supabase
      .from('ticktick_integrations')
      .upsert({
        user_id: state || 'default',
        access_token: tokenData.access_token,
        token_type: tokenData.token_type || 'Bearer',
        expires_at: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString(),
        scope: tokenData.scope || 'tasks:read tasks:write',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('Failed to store tokens:', upsertError);
      return new Response(`Failed to store tokens: ${upsertError.message}`, { status: 500 });
    }

    console.log('TickTick integration saved successfully for user:', state);
    
    // Redirect back to admin with success message - use the correct app URL
    const appUrl = 'https://id-preview--5b1494ff-18fc-4a22-a465-819f9d927369.lovable.app';
    const redirectUrl = `${appUrl}/admin?ticktick=connected`;
    
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>TickTick Conectado</title>
          <script>
            // Try to close popup and notify opener
            if (window.opener) {
              window.opener.postMessage({ type: 'ticktick_connected' }, '*');
              window.close();
            } else {
              // If not a popup, redirect
              window.location.href = '${redirectUrl}';
            }
          </script>
        </head>
        <body>
          <p>TickTick conectado com sucesso! Esta janela pode ser fechada.</p>
          <p><a href="${redirectUrl}">Clique aqui se não for redirecionado automaticamente</a></p>
        </body>
      </html>
    `, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    return new Response(`Error: ${error.message}`, { status: 500, headers: corsHeaders });
  }
});
