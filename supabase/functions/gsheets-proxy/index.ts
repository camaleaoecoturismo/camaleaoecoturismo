// Supabase Edge Function: gsheets-proxy
// Proxies a public Google Sheets CSV URL to bypass browser CORS
// Usage: POST { url: string }

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "Missing 'url' in body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let target: URL;
    try {
      target = new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Basic allowlist for Google Sheets CSV export
    const allowedHosts = ["docs.google.com", "www.docs.google.com"]; // defensive
    const isGoogleSheets =
      allowedHosts.includes(target.hostname) &&
      target.pathname.includes("/spreadsheets/d/") &&
      (target.searchParams.get("format") === "csv" || target.pathname.includes("/export"));

    if (!isGoogleSheets) {
      return new Response(JSON.stringify({ error: "Only Google Sheets CSV export URLs are allowed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fetchStart = Date.now();
    const upstream = await fetch(target.toString(), { method: "GET" });

    if (!upstream.ok) {
      const msg = `Upstream fetch failed (${upstream.status})`;
      console.error("gsheets-proxy:", msg, target.toString());
      return new Response(JSON.stringify({ error: msg }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const csvText = await upstream.text();
    const duration = Date.now() - fetchStart;
    console.log("gsheets-proxy: fetched", csvText.length, "bytes in", duration, "ms");

    return new Response(csvText, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("gsheets-proxy error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
