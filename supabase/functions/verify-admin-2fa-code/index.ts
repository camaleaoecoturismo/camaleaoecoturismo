import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const REST = `${SUPABASE_URL}/rest/v1`;
  const dbHeaders = {
    "apikey": SERVICE_KEY,
    "Authorization": `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  };

  try {
    const body = await req.json();
    const email: string = body.email ?? "";
    const code: string = body.code ?? "";
    const userId: string | null = body.user_id ?? null;
    const deviceFp: string | null = body.device_fingerprint ?? null;
    const ipAddress: string | null =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

    if (!email || !code) {
      return json({ valid: false, error: "Email e código são obrigatórios" });
    }

    // ── 1. Find valid code ────────────────────────────────────────────────
    const now = new Date().toISOString();
    const codeRes = await fetch(
      `${REST}/email_verification_codes?email=eq.${encodeURIComponent(email)}&expires_at=gt.${encodeURIComponent(now)}&verified_at=is.null&order=created_at.desc&limit=1`,
      { headers: dbHeaders }
    );

    if (!codeRes.ok) {
      console.error("DB error fetching code:", await codeRes.text());
      return json({ valid: false, error: "Erro ao buscar código" });
    }

    const rows = await codeRes.json();
    const row = rows?.[0] ?? null;

    if (!row) {
      return json({ valid: false, error: "Código inválido ou expirado" });
    }

    // ── 2. Rate limiting ──────────────────────────────────────────────────
    const attempts = (row.attempts ?? 0) as number;
    if (attempts >= 5) {
      await fetch(`${REST}/email_verification_codes?id=eq.${row.id}`, {
        method: "DELETE",
        headers: dbHeaders,
      });
      return json({ valid: false, error: "Muitas tentativas. Solicite um novo código.", too_many_attempts: true });
    }

    // ── 3. Verify code ────────────────────────────────────────────────────
    if (row.code !== code) {
      await fetch(`${REST}/email_verification_codes?id=eq.${row.id}`, {
        method: "PATCH",
        headers: dbHeaders,
        body: JSON.stringify({ attempts: attempts + 1 }),
      });
      const remaining = 4 - attempts;
      return json({
        valid: false,
        error: remaining > 0
          ? `Código incorreto. ${remaining} tentativa(s) restante(s).`
          : "Último código. Solicite um novo.",
      });
    }

    // ── 4. Delete used code ───────────────────────────────────────────────
    await fetch(`${REST}/email_verification_codes?id=eq.${row.id}`, {
      method: "DELETE",
      headers: dbHeaders,
    });

    // ── 5. Create 2FA session ─────────────────────────────────────────────
    const finalUserId = userId ?? row.user_id ?? null;
    if (finalUserId) {
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

      // Delete existing session for this device
      if (deviceFp) {
        await fetch(
          `${REST}/admin_2fa_sessions?user_id=eq.${finalUserId}&device_fingerprint=eq.${encodeURIComponent(deviceFp)}`,
          { method: "DELETE", headers: dbHeaders }
        );
      }

      await fetch(`${REST}/admin_2fa_sessions`, {
        method: "POST",
        headers: dbHeaders,
        body: JSON.stringify({
          user_id: finalUserId,
          expires_at: expiresAt,
          device_fingerprint: deviceFp,
          ip_address: ipAddress,
        }),
      });
    }

    console.log(`2FA verified for: ${email}`);
    return json({ valid: true, message: "Código verificado com sucesso" });

  } catch (err) {
    console.error("Unexpected error in verify-admin-2fa-code:", err);
    return json({ valid: false, error: "Erro interno do servidor" }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
