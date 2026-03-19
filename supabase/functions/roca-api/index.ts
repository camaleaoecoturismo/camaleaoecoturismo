import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROCA_BASE_URL = "https://www.roca.floripa.br/api";
const SUPABASE_URL = "https://guwplwuwriixgvkjlutg.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check admin role
    const { data: roleData } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").single();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { action, ...params } = body;

    // Get Roca settings
    const { data: settings } = await supabaseAdmin.from("roca_settings").select("*").limit(1).single();

    const respond = (data: any, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Helper to log execution
    const logExecution = async (logData: any) => {
      await supabaseAdmin.from("roca_execution_logs").insert({
        ...logData,
        admin_user_id: user.id,
      });
    };

    switch (action) {
      // ============ SETTINGS ============
      case "save_settings": {
        const { tokenusuario, carta_oferta, senha, auto_execute_enabled, auto_execute_time } = params;
        const upsertData: any = { carta_oferta };
        if (tokenusuario !== undefined) upsertData.tokenusuario_secret = tokenusuario;
        if (senha !== undefined) upsertData.senha_secret = senha;
        if (auto_execute_enabled !== undefined) upsertData.auto_execute_enabled = auto_execute_enabled;
        if (auto_execute_time !== undefined) upsertData.auto_execute_time = auto_execute_time;

        if (settings) {
          const { error } = await supabaseAdmin.from("roca_settings").update(upsertData).eq("id", settings.id);
          if (error) return respond({ error: error.message }, 500);
        } else {
          const { error } = await supabaseAdmin.from("roca_settings").insert(upsertData);
          if (error) return respond({ error: error.message }, 500);
        }
        return respond({ success: true });
      }

      case "get_settings": {
        if (!settings) return respond({ settings: null });
        return respond({
          settings: {
            carta_oferta: settings.carta_oferta,
            has_tokenusuario: !!settings.tokenusuario_secret,
            has_senha: !!settings.senha_secret,
            has_jwt: !!settings.jwt_secret,
            jwt_updated_at: settings.jwt_updated_at,
            auto_execute_enabled: settings.auto_execute_enabled ?? true,
            auto_execute_time: settings.auto_execute_time ?? '20:00',
          },
        });
      }

      // ============ AUTH / JWT ============
      case "generate_jwt": {
        if (!settings?.carta_oferta) return respond({ error: "cartaOferta não configurado" }, 400);

        const rocaBody: any = { cartaOferta: settings.carta_oferta };
        if (settings.senha_secret) rocaBody.senha = settings.senha_secret;

        const res = await fetch(`${ROCA_BASE_URL}/seguroAventura/cartaOferta`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rocaBody),
        });

        const responseText = await res.text();
        let jwt: string | null = null;

        // Try to find JWT in body
        try {
          const resBody = JSON.parse(responseText);
          jwt = resBody.jwt || resBody.token || resBody.access_token || null;
        } catch {}

        // Try headers
        if (!jwt) {
          jwt = res.headers.get("Authorization") || res.headers.get("jwt") || res.headers.get("x-jwt") || null;
        }

        if (jwt) {
          await supabaseAdmin.from("roca_settings").update({
            jwt_secret: jwt,
            jwt_updated_at: new Date().toISOString(),
          }).eq("id", settings.id);
          return respond({ success: true, jwt_updated: true });
        }

        return respond({
          success: false,
          error: "JWT não encontrado na resposta",
          raw_response: responseText.substring(0, 500),
          status_code: res.status,
        }, 400);
      }

      case "lembrar_carta_oferta": {
        if (!settings?.tokenusuario_secret) return respond({ error: "tokenusuario não configurado" }, 400);

        const res = await fetch(`${ROCA_BASE_URL}/seguroAventura/lembrarCartaOferta`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            tokenusuario: settings.tokenusuario_secret,
          },
          body: JSON.stringify({ busca: params.busca }),
        });

        const resText = await res.text();
        let resData;
        try { resData = JSON.parse(resText); } catch { resData = resText; }

        return respond({ data: resData, status_code: res.status });
      }

      case "test_connection": {
        if (!settings?.jwt_secret) return respond({ error: "JWT não configurado. Gere o JWT primeiro." }, 400);

        const res = await fetch(`${ROCA_BASE_URL}/seguroAventura/eventosCartaOferta?pagina=1&registrosPorPagina=1`, {
          headers: { Authorization: settings.jwt_secret },
        });

        const resText = await res.text();
        return respond({ connected: res.ok, status_code: res.status, data: resText.substring(0, 300) });
      }

      // ============ EVENTS ============
      case "list_events": {
        if (!settings?.jwt_secret) return respond({ error: "JWT não configurado" }, 400);

        const urlParams = new URLSearchParams();
        urlParams.append("pagina", String(params.pagina || 1));
        urlParams.append("registrosPorPagina", String(params.registrosPorPagina || 20));
        if (params.texto) urlParams.append("texto", params.texto);
        ["S", "N"].forEach(v => urlParams.append("ativo[]", v));
        ["cancelado", "aberto", "finalizado"].forEach(v => urlParams.append("estados[]", v));

        const res = await fetch(`${ROCA_BASE_URL}/seguroAventura/eventosCartaOferta?${urlParams}`, {
          headers: { Authorization: settings.jwt_secret },
        });

        const resText = await res.text();
        let resData;
        try { resData = JSON.parse(resText); } catch { resData = resText; }

        return respond({ data: resData, status_code: res.status });
      }

      case "create_event": {
        if (!settings?.carta_oferta) return respond({ error: "Carta oferta não configurada" }, 400);

        // Auto-regenerate JWT before creating event
        let currentJwt = settings?.jwt_secret;
        if (settings?.carta_oferta) {
          console.log("[Roca] Auto-regenerating JWT before create_event...");
          const jwtBody: any = { cartaOferta: settings.carta_oferta };
          if (settings.senha_secret) jwtBody.senha = settings.senha_secret;
          const jwtRes = await fetch(`${ROCA_BASE_URL}/seguroAventura/cartaOferta`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(jwtBody),
          });
          const jwtResText = await jwtRes.text();
          let newJwt: string | null = null;
          try {
            const jwtData = JSON.parse(jwtResText);
            newJwt = jwtData.jwt || jwtData.token || jwtData.access_token || null;
          } catch {}
          if (!newJwt) {
            newJwt = jwtRes.headers.get("Authorization") || jwtRes.headers.get("jwt") || jwtRes.headers.get("x-jwt") || null;
          }
          if (newJwt) {
            console.log("[Roca] JWT regenerated successfully");
            currentJwt = newJwt;
            await supabaseAdmin.from("roca_settings").update({
              jwt_secret: newJwt,
              jwt_updated_at: new Date().toISOString(),
            }).eq("id", settings.id);
          } else {
            console.log("[Roca] JWT regeneration failed, using existing. Status:", jwtRes.status);
          }
        }

        if (!currentJwt) return respond({ error: "JWT não configurado e regeneração falhou" }, 400);

        const { trip_id, dados, participantes } = params;

        const eventBody: any = {
          dados: { ...dados, cartaOferta: settings.carta_oferta },
        };
        if (participantes && participantes.length > 0) {
          eventBody.participantes = participantes;
        }

        console.log("[Roca] create_event request:", JSON.stringify(eventBody).substring(0, 1000));

        const res = await fetch(`${ROCA_BASE_URL}/seguroAventura/evento`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: currentJwt,
          },
          body: JSON.stringify(eventBody),
        });

        const resText = await res.text();
        console.log("[Roca] create_event response:", res.status, resText.substring(0, 500));
        let resData: any;
        try { resData = JSON.parse(resText); } catch { resData = null; }

        let tokenEvento = resData?.tokenEvento || resData?.token || resData?.data?.tokenEvento || null;

        // If no token, try to find via listing
        if (!tokenEvento && res.ok) {
          const searchText = dados.nomeEvento;
          const searchRes = await fetch(
            `${ROCA_BASE_URL}/seguroAventura/eventosCartaOferta?pagina=1&registrosPorPagina=5&texto=${encodeURIComponent(searchText)}&ativo[]=S`,
            { headers: { Authorization: currentJwt } }
          );
          const searchText2 = await searchRes.text();
          try {
            const searchData = JSON.parse(searchText2);
            const events = searchData?.data || searchData?.eventos || searchData || [];
            const arr = Array.isArray(events) ? events : [];
            if (arr.length > 0) {
              tokenEvento = arr[0].tokenEvento || arr[0].token || null;
            }
          } catch {}
        }

        // Upsert trip_roca_event
        const eventRecord: any = {
          trip_id,
          enabled: true,
          status: res.ok ? (tokenEvento ? "ATIVO" : "PENDENTE") : "ERRO",
          token_evento: tokenEvento,
          error_message: !res.ok ? `HTTP ${res.status}: ${resText.substring(0, 300)}` : null,
          raw_request: eventBody,
          raw_response: resData || resText.substring(0, 1000),
          last_sync_at: new Date().toISOString(),
        };

        const { data: existingEvent } = await supabaseAdmin.from("trip_roca_event").select("id").eq("trip_id", trip_id).single();
        if (existingEvent) {
          await supabaseAdmin.from("trip_roca_event").update(eventRecord).eq("id", existingEvent.id);
        } else {
          await supabaseAdmin.from("trip_roca_event").insert(eventRecord);
        }

        // Save participants locally
        if (participantes && participantes.length > 0) {
          for (const p of participantes) {
            const cpf = p.dados.cpf.replace(/\D/g, "");
            await supabaseAdmin.from("trip_roca_participant").upsert(
              {
                trip_id,
                cpf,
                nome: p.dados.nome,
                status: res.ok ? "ENVIADO" : "ERRO",
                error_message: !res.ok ? `Evento falhou: HTTP ${res.status}` : null,
                sent_at: res.ok ? new Date().toISOString() : null,
                raw_request: p,
              },
              { onConflict: "trip_id,cpf" }
            );
          }
        }

        await logExecution({
          trip_id,
          action: "create_event",
          total_confirmed: participantes?.length || 0,
          total_sent: res.ok ? (participantes?.length || 0) : 0,
          total_errors: res.ok ? 0 : (participantes?.length || 0),
          raw_request: eventBody,
          raw_response: resData || resText.substring(0, 1000),
        });

        return respond({
          success: res.ok,
          token_evento: tokenEvento,
          status_code: res.status,
          needs_manual_token: res.ok && !tokenEvento,
        });
      }

      case "get_event": {
        const { token_evento } = params;
        const res = await fetch(`${ROCA_BASE_URL}/seguroAventura/token/${encodeURIComponent(token_evento)}`);
        const resText = await res.text();
        let resData;
        try { resData = JSON.parse(resText); } catch { resData = resText; }
        return respond({ data: resData, status_code: res.status });
      }

      case "update_event": {
        const { token_evento, dados } = params;
        const res = await fetch(`${ROCA_BASE_URL}/seguroAventura/token/${encodeURIComponent(token_evento)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: settings?.jwt_secret || "" },
          body: JSON.stringify({ dados }),
        });
        const resText = await res.text();
        return respond({ success: res.ok, status_code: res.status, raw: resText.substring(0, 300) });
      }

      case "cancel_event": {
        const { token_evento, trip_id } = params;
        const res = await fetch(`${ROCA_BASE_URL}/seguroAventura/evento/${encodeURIComponent(token_evento)}`, {
          method: "DELETE",
          headers: { Authorization: settings?.jwt_secret || "" },
        });
        
        if (trip_id) {
          await supabaseAdmin.from("trip_roca_event").update({ status: "CANCELADO" }).eq("trip_id", trip_id);
        }

        await logExecution({ trip_id, action: "cancel_event" });
        return respond({ success: res.ok, status_code: res.status });
      }

      // ============ PARTICIPANTS ============
      case "add_participants": {
        const { token_evento, participantes, trip_id } = params;

        const requestBody = { participantes };
        console.log("[Roca] add_participants request:", JSON.stringify({ token_evento, count: participantes?.length, body: requestBody }).substring(0, 1000));

        const res = await fetch(`${ROCA_BASE_URL}/seguroAventuraParticipante/evento/${token_evento}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: settings?.jwt_secret || "" },
          body: JSON.stringify(requestBody),
        });

        const resText = await res.text();
        console.log("[Roca] add_participants response:", res.status, resText.substring(0, 500));

        // Update local records
        for (const p of participantes) {
          const cpf = p.dados.cpf.replace(/\D/g, "");
          await supabaseAdmin.from("trip_roca_participant").upsert(
            {
              trip_id,
              cpf,
              nome: p.dados.nome,
              status: res.ok ? "ENVIADO" : "ERRO",
              error_message: !res.ok ? `HTTP ${res.status}` : null,
              sent_at: res.ok ? new Date().toISOString() : null,
              raw_request: p,
            },
            { onConflict: "trip_id,cpf" }
          );
        }

        await logExecution({
          trip_id,
          action: "add_participants",
          total_sent: res.ok ? participantes.length : 0,
          total_errors: res.ok ? 0 : participantes.length,
        });

        return respond({ success: res.ok, status_code: res.status });
      }

      case "sync_participants": {
        const { token_evento, trip_id } = params;
        if (!settings?.jwt_secret) return respond({ error: "JWT não configurado" }, 400);

        let allParticipants: any[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const urlParams = new URLSearchParams({
            token: token_evento,
            pagina: String(page),
            registrosPorPagina: "50",
          });
          ["S", "N"].forEach(v => urlParams.append("cancelado[]", v));

          const res = await fetch(`${ROCA_BASE_URL}/seguroAventura/participantes/token?${urlParams}`, {
            headers: { Authorization: settings.jwt_secret },
          });

          const resText = await res.text();
          let resData: any;
          try { resData = JSON.parse(resText); } catch { break; }

          const items = resData?.data || resData?.participantes || resData || [];
          const arr = Array.isArray(items) ? items : [];

          if (arr.length === 0) {
            hasMore = false;
          } else {
            allParticipants.push(...arr);
            page++;
            if (arr.length < 50) hasMore = false;
          }
        }

        let synced = 0;
        for (const p of allParticipants) {
          const cpf = (p.cpf || "").replace(/\D/g, "");
          if (!cpf) continue;

          const tokenParticipante = p.tokenParticipante || p.token || null;
          const idParticipante = p.idParticipante || p.id || null;
          const isCancelled = p.cancelado === "S" || p.status === "CANCELADO" || p.cancelado === true;

          await supabaseAdmin.from("trip_roca_participant").upsert(
            {
              trip_id,
              cpf,
              nome: p.nome || p.name || null,
              token_participante: tokenParticipante,
              id_participante: idParticipante ? String(idParticipante) : null,
              status: isCancelled ? "CANCELADO" : "ATIVO",
              last_sync_at: new Date().toISOString(),
              raw_response: p,
            },
            { onConflict: "trip_id,cpf" }
          );
          synced++;
        }

        // Update event sync time
        await supabaseAdmin.from("trip_roca_event").update({ last_sync_at: new Date().toISOString() }).eq("trip_id", trip_id);

        await logExecution({
          trip_id,
          action: "sync_participants",
          total_active: allParticipants.filter(p => p.cancelado !== "S" && p.status !== "CANCELADO").length,
          total_sent: synced,
        });

        return respond({ success: true, total_synced: synced, total_found: allParticipants.length });
      }

      case "cancel_participant": {
        const { token_participante, trip_id, cpf } = params;
        const res = await fetch(`${ROCA_BASE_URL}/seguroAventuraParticipante/integrado/cancelar/${token_participante}`, {
          method: "DELETE",
          headers: { Authorization: settings?.jwt_secret || "" },
        });

        if (trip_id && cpf) {
          await supabaseAdmin.from("trip_roca_participant").update({ status: "CANCELADO" }).eq("trip_id", trip_id).eq("cpf", cpf);
        }

        await logExecution({ trip_id, action: "cancel_participant" });
        return respond({ success: res.ok, status_code: res.status });
      }

      case "delete_participant": {
        const { token_participante, trip_id, cpf } = params;
        const res = await fetch(`${ROCA_BASE_URL}/seguroAventuraParticipante/${token_participante}`, {
          method: "DELETE",
          headers: { Authorization: settings?.jwt_secret || "" },
        });

        if (trip_id && cpf) {
          await supabaseAdmin.from("trip_roca_participant").update({ status: "EXCLUIDO" }).eq("trip_id", trip_id).eq("cpf", cpf);
        }

        await logExecution({ trip_id, action: "delete_participant" });
        return respond({ success: res.ok, status_code: res.status });
      }

      case "lookup_participant_cpf": {
        if (!settings?.jwt_secret) return respond({ error: "JWT não configurado" }, 400);
        const { cpf } = params;
        const res = await fetch(`${ROCA_BASE_URL}/seguroAventuraParticipante/cpf?cpf=${cpf}`, {
          headers: { Authorization: settings.jwt_secret },
        });
        const resText = await res.text();
        let resData;
        try { resData = JSON.parse(resText); } catch { resData = resText; }
        return respond({ data: resData, status_code: res.status });
      }

      // ============ DOWNLOADS ============
      case "download_pdf": {
        if (!settings?.jwt_secret) return respond({ error: "JWT não configurado" }, 400);
        const { token_evento } = params;
        const res = await fetch(`${ROCA_BASE_URL}/seguroAventura/pdfComprovanteContratacao/${encodeURIComponent(token_evento)}`, {
          headers: { Authorization: settings.jwt_secret },
        });

        if (!res.ok) return respond({ error: "Falha ao baixar PDF", status_code: res.status }, 400);

        const buffer = await res.arrayBuffer();
        return new Response(buffer, {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="comprovante-roca-${token_evento}.pdf"`,
          },
        });
      }

      case "download_xls": {
        if (!settings?.jwt_secret) return respond({ error: "JWT não configurado" }, 400);
        const { token_evento } = params;
        const res = await fetch(`${ROCA_BASE_URL}/seguroAventura/xlsParticipantes/${encodeURIComponent(token_evento)}`, {
          headers: { Authorization: settings.jwt_secret },
        });

        if (!res.ok) return respond({ error: "Falha ao baixar XLS", status_code: res.status }, 400);

        const buffer = await res.arrayBuffer();
        return new Response(buffer, {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/vnd.ms-excel",
            "Content-Disposition": `attachment; filename="participantes-roca-${token_evento}.xls"`,
          },
        });
      }

      case "save_manual_token": {
        const { trip_id, token_evento } = params;
        await supabaseAdmin.from("trip_roca_event").update({
          token_evento,
          status: "ATIVO",
        }).eq("trip_id", trip_id);
        return respond({ success: true });
      }

      default:
        return respond({ error: `Ação desconhecida: ${action}` }, 400);
    }
  } catch (error) {
    console.error("Roca API error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
