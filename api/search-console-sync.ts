import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createSign } from "node:crypto";

const SUPABASE_URL = "https://guwplwuwriixgvkjlutg.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1d3Bsd3V3cmlpeGd2a2psdXRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MzE3MDYsImV4cCI6MjA2OTMwNzcwNn0.XqFnllTUiv1SZrnL23hy7pWWeIeWDldfm9lpfO3vIQg";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SEARCH_CONSOLE_URL = "https://www.googleapis.com/webmasters/v3";
const GOOGLE_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const ROW_LIMIT = 25000;
const MAX_ROWS = 100000;

type SyncRequestBody = {
  startDate?: string;
  endDate?: string;
  notes?: string;
};

function base64UrlEncode(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function getPrivateKey() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "";
  return raw.replace(/\\n/g, "\n");
}

async function getAuthenticatedUser(accessToken: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) return null;
  return res.json();
}

async function getCurrentUserRole(accessToken: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_current_user_role`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });

  if (!res.ok) return null;
  return res.json();
}

async function insertBatch(accessToken: string, payload: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/search_console_import_batches`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Falha ao criar lote no Supabase (${res.status}).`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

async function insertMetrics(accessToken: string, payload: Array<Record<string, unknown>>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/search_console_metrics`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Falha ao salvar métricas do Search Console (${res.status}).`);
  }
}

async function updateBatchRows(accessToken: string, batchId: string, rowCount: number) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/search_console_import_batches?id=eq.${batchId}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      rows_imported: rowCount,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao atualizar lote do Search Console (${res.status}).`);
  }
}

async function getGoogleAccessToken() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = getPrivateKey();

  if (!clientEmail || !privateKey) {
    throw new Error("Configuração incompleta da conta de serviço do Google.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  const claimSet = {
    iss: clientEmail,
    scope: GOOGLE_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };

  const unsignedJwt = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claimSet))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedJwt);
  const signature = signer.sign(privateKey);
  const jwt = `${unsignedJwt}.${base64UrlEncode(signature)}`;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha ao autenticar no Google: ${errorText}`);
  }

  const data = await response.json();
  return data.access_token as string;
}

async function fetchSearchConsoleRows(accessToken: string, siteUrl: string, startDate: string, endDate: string) {
  const encodedSiteUrl = encodeURIComponent(siteUrl);
  const rows: Array<{
    page_url: string;
    page_path: string;
    query_text: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }> = [];

  for (let startRow = 0; startRow < MAX_ROWS; startRow += ROW_LIMIT) {
    const response = await fetch(`${GOOGLE_SEARCH_CONSOLE_URL}/sites/${encodedSiteUrl}/searchAnalytics/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["page", "query"],
        rowLimit: ROW_LIMIT,
        startRow,
        type: "web",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Falha ao consultar Search Console: ${errorText}`);
    }

    const data = await response.json();
    const batchRows = Array.isArray(data.rows) ? data.rows : [];

    if (batchRows.length === 0) break;

    batchRows.forEach((row: any) => {
      const pageUrl = String(row.keys?.[0] || "").trim();
      const query = String(row.keys?.[1] || "").trim();
      const pagePath = (() => {
        try {
          return new URL(pageUrl).pathname || "/";
        } catch {
          return "/";
        }
      })();

      rows.push({
        page_url: pageUrl,
        page_path: pagePath,
        query_text: query,
        clicks: Math.round(Number(row.clicks || 0)),
        impressions: Math.round(Number(row.impressions || 0)),
        ctr: Number(row.ctr || 0) * 100,
        position: Number(row.position || 0),
      });
    });

    if (batchRows.length < ROW_LIMIT) break;
  }

  return rows;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!accessToken) {
      return res.status(401).json({ error: "Token de autenticação ausente." });
    }

    const user = await getAuthenticatedUser(accessToken);
    if (!user) {
      return res.status(401).json({ error: "Sessão inválida." });
    }

    const role = await getCurrentUserRole(accessToken);
    if (role !== "admin") {
      return res.status(403).json({ error: "Acesso permitido apenas para administradores." });
    }

    const { startDate, endDate, notes }: SyncRequestBody = req.body || {};
    const siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL;

    if (!siteUrl) {
      return res.status(500).json({
        error: "Defina GOOGLE_SEARCH_CONSOLE_SITE_URL no ambiente.",
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Informe startDate e endDate." });
    }

    const googleAccessToken = await getGoogleAccessToken();
    const rows = await fetchSearchConsoleRows(googleAccessToken, siteUrl, startDate, endDate);

    const batch = await insertBatch(accessToken, {
      report_start_date: startDate,
      report_end_date: endDate,
      source_file: "API Search Console",
      notes: notes || "Sincronização automática via API",
      rows_imported: 0,
    });

    if (rows.length > 0) {
      const chunkSize = 1000;
      for (let index = 0; index < rows.length; index += chunkSize) {
        const chunk = rows.slice(index, index + chunkSize).map((row) => ({
          batch_id: batch.id,
          ...row,
        }));
        await insertMetrics(accessToken, chunk);
      }
    }

    await updateBatchRows(accessToken, batch.id, rows.length);

    return res.status(200).json({
      success: true,
      batchId: batch.id,
      rowsImported: rows.length,
      siteUrl,
    });
  } catch (error: any) {
    console.error("Search Console sync error:", error);
    return res.status(500).json({
      error: error.message || "Erro inesperado ao sincronizar Search Console.",
    });
  }
}
