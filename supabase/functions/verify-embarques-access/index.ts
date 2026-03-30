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
    const secret = Deno.env.get('EMBARQUES_ACCESS_SECRET');
    if (!secret) {
      throw new Error('EMBARQUES_ACCESS_SECRET not configured in Supabase secrets');
    }

    const body = await req.json();
    const { password, token } = body;

    // ── TOKEN VERIFICATION MODE ─────────────────────────────────────────────
    if (token) {
      const parts = (token as string).split(':');
      if (parts.length !== 2) {
        return new Response(JSON.stringify({ valid: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const [timestamp, providedHashB64] = parts;
      const ts = parseInt(timestamp, 10);

      // 8-hour expiry
      if (isNaN(ts) || Date.now() - ts > 8 * 60 * 60 * 1000) {
        return new Response(JSON.stringify({ valid: false, reason: 'expired' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const encoder = new TextEncoder();
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify'],
      );

      let hashBytes: Uint8Array;
      try {
        hashBytes = Uint8Array.from(atob(providedHashB64), (c) => c.charCodeAt(0));
      } catch {
        return new Response(JSON.stringify({ valid: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const isValid = await crypto.subtle.verify('HMAC', cryptoKey, hashBytes, encoder.encode(timestamp));

      return new Response(JSON.stringify({ valid: isValid }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── PASSWORD VERIFICATION MODE ──────────────────────────────────────────
    if (!password) {
      return new Response(JSON.stringify({ error: 'password required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: setting } = await supabase
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', 'embarques_password')
      .maybeSingle();

    if (!setting?.setting_value) {
      return new Response(
        JSON.stringify({ error: 'Senha não configurada. Defina embarques_password em site_settings no Supabase.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (password !== setting.setting_value) {
      return new Response(JSON.stringify({ valid: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate signed HMAC token (timestamp:base64_hmac)
    const timestamp = Date.now().toString();
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    const hashBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(timestamp));
    const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
    const tokenResult = `${timestamp}:${hashBase64}`;

    return new Response(JSON.stringify({ valid: true, token: tokenResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('verify-embarques-access error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
