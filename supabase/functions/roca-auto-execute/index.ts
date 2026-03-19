import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROCA_BASE_URL = "https://www.roca.floripa.br/api";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    console.log("[Roca Auto] Starting auto-execute check...");

    // Get Roca settings
    const { data: settings } = await supabaseAdmin.from("roca_settings").select("*").limit(1).single();
    if (!settings?.carta_oferta) {
      console.log("[Roca Auto] Carta oferta not configured, skipping");
      return new Response(JSON.stringify({ skipped: true, reason: "Carta oferta not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if auto-execution is enabled
    if (settings.auto_execute_enabled === false) {
      console.log("[Roca Auto] Auto-execution is disabled, skipping");
      return new Response(JSON.stringify({ skipped: true, reason: "Auto-execution disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auto-regenerate JWT before execution to prevent expired token errors
    console.log("[Roca Auto] Regenerating JWT before execution...");
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
      console.log("[Roca Auto] JWT regenerated successfully");
      await supabaseAdmin.from("roca_settings").update({
        jwt_secret: newJwt,
        jwt_updated_at: new Date().toISOString(),
      }).eq("id", settings.id);
      settings.jwt_secret = newJwt;
    } else {
      console.log("[Roca Auto] JWT regeneration failed, using existing JWT. Status:", jwtRes.status);
      if (!settings.jwt_secret) {
        return new Response(JSON.stringify({ skipped: true, reason: "JWT not configured and regeneration failed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Find tours starting tomorrow (using BRT timezone = America/Recife)
    // We look for tours whose start_date is tomorrow
    const now = new Date();
    // BRT is UTC-3
    const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const tomorrow = new Date(brt);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0]; // YYYY-MM-DD

    console.log("[Roca Auto] Looking for tours starting on:", tomorrowStr);

    // Get active tours starting tomorrow
    const { data: tours, error: toursError } = await supabaseAdmin
      .from("tours")
      .select("id, name, start_date, end_date, city, state, about")
      .eq("start_date", tomorrowStr)
      .eq("is_active", true);

    if (toursError) {
      console.error("[Roca Auto] Error fetching tours:", toursError);
      return new Response(JSON.stringify({ error: toursError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!tours || tours.length === 0) {
      console.log("[Roca Auto] No tours starting tomorrow");
      return new Response(JSON.stringify({ processed: 0, reason: "No tours tomorrow" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const tour of tours) {
      console.log(`[Roca Auto] Processing tour: ${tour.name} (${tour.id})`);

      // Check if already has an active Roca event
      const { data: existingEvent } = await supabaseAdmin
        .from("trip_roca_event")
        .select("id, status, token_evento")
        .eq("trip_id", tour.id)
        .single();

      if (existingEvent?.status === "ATIVO" && existingEvent?.token_evento) {
        console.log(`[Roca Auto] Tour ${tour.name} already has active Roca event, skipping`);
        results.push({ tour: tour.name, skipped: true, reason: "Already active" });
        continue;
      }

      // Get confirmed participants
      const { data: reservas } = await supabaseAdmin
        .from("reservas")
        .select("id, cliente_id, numero_participantes, clientes!fk_reservas_cliente(nome_completo, cpf, email, whatsapp, data_nascimento)")
        .eq("tour_id", tour.id)
        .in("status", ["confirmada", "confirmado"])
        .in("payment_status", ["pago", "confirmed"]);

      if (!reservas || reservas.length === 0) {
        console.log(`[Roca Auto] No confirmed reservations for ${tour.name}`);
        results.push({ tour: tour.name, skipped: true, reason: "No confirmed reservations" });
        continue;
      }

      // Build participant list
      const allParticipants: any[] = [];
      let index = 1;

      for (const r of reservas) {
        const cliente = (r as any).clientes;
        if (!cliente) continue;

        const { data: rpEntries } = await supabaseAdmin
          .from("reservation_participants")
          .select("nome_completo, cpf, data_nascimento, email, whatsapp")
          .eq("reserva_id", r.id)
          .eq("is_staff", false);

        if (rpEntries && rpEntries.length > 0) {
          for (const rp of rpEntries) {
            allParticipants.push({
              dados: {
                numeroInscricao: String(index).padStart(3, "0"),
                nome: rp.nome_completo || cliente.nome_completo,
                cpf: ((rp as any).cpf || cliente.cpf || "").replace(/\D/g, ""),
                dataNascimento: (rp as any).data_nascimento || cliente.data_nascimento,
                email: (rp as any).email || cliente.email,
                telefone: ((rp as any).whatsapp || cliente.whatsapp || "").replace(/\D/g, ""),
                estrangeiro: "N",
                numeroPassaporte: "",
                nacionalidade: "Brasil",
              },
            });
            index++;
          }
        } else {
          allParticipants.push({
            dados: {
              numeroInscricao: String(index).padStart(3, "0"),
              nome: cliente.nome_completo,
              cpf: (cliente.cpf || "").replace(/\D/g, ""),
              dataNascimento: cliente.data_nascimento,
              email: cliente.email,
              telefone: (cliente.whatsapp || "").replace(/\D/g, ""),
              estrangeiro: "N",
              numeroPassaporte: "",
              nacionalidade: "Brasil",
            },
          });
          index++;
        }
      }

      // Filter already active participants
      const { data: existingParts } = await supabaseAdmin
        .from("trip_roca_participant")
        .select("cpf")
        .eq("trip_id", tour.id)
        .eq("status", "ATIVO");

      const activeCpfs = new Set((existingParts || []).map((p: any) => p.cpf));
      const toSend = allParticipants.filter((p) => !activeCpfs.has(p.dados.cpf));

      // Validate participants
      const valid = toSend.filter((p) => {
        const d = p.dados;
        return (
          d.nome && d.nome.trim().length >= 2 &&
          d.cpf && d.cpf.replace(/\D/g, "").length === 11 &&
          d.dataNascimento &&
          d.email && d.email.includes("@") &&
          d.telefone && d.telefone.replace(/\D/g, "").length >= 10
        );
      });

      if (valid.length === 0 && toSend.length === 0) {
        console.log(`[Roca Auto] All participants already active for ${tour.name}`);
        results.push({ tour: tour.name, skipped: true, reason: "All already active" });
        continue;
      }

      console.log(`[Roca Auto] ${tour.name}: ${allParticipants.length} total, ${toSend.length} to send, ${valid.length} valid`);

      // Execute: create event or add participants
      const cleanDescription = tour.about
        ? tour.about.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim().substring(0, 200)
        : `${tour.name} | ${tour.start_date}`;

      if (!existingEvent?.token_evento || existingEvent?.status === "CANCELADO") {
        // Create event with participants
        const nomeEvento = `${tour.name} | ${tour.start_date}`;
        const eventBody: any = {
          dados: {
            nomeEvento,
            dataInicio: tour.start_date,
            dataFinal: tour.end_date || tour.start_date,
            horaInicio: "06:00:00",
            localEvento: tour.city && tour.state ? `${tour.city}/${tour.state}` : tour.city || "Brasil",
            descricao: cleanDescription,
            cartaOferta: settings.carta_oferta,
          },
        };
        if (valid.length > 0) {
          eventBody.participantes = valid;
        }

        console.log(`[Roca Auto] Creating event for ${tour.name}`);
        const res = await fetch(`${ROCA_BASE_URL}/seguroAventura/evento`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: settings.jwt_secret,
          },
          body: JSON.stringify(eventBody),
        });

        const resText = await res.text();
        let resData: any;
        try { resData = JSON.parse(resText); } catch { resData = null; }

        let tokenEvento = resData?.tokenEvento || resData?.token || resData?.data?.tokenEvento || null;

        // Try to find token via listing
        if (!tokenEvento && res.ok) {
          const searchRes = await fetch(
            `${ROCA_BASE_URL}/seguroAventura/eventosCartaOferta?pagina=1&registrosPorPagina=5&texto=${encodeURIComponent(tour.name)}&ativo[]=S`,
            { headers: { Authorization: settings.jwt_secret } }
          );
          const searchText = await searchRes.text();
          try {
            const searchData = JSON.parse(searchText);
            const events = searchData?.data || searchData?.eventos || searchData || [];
            const arr = Array.isArray(events) ? events : [];
            if (arr.length > 0) {
              tokenEvento = arr[0].tokenEvento || arr[0].token || null;
            }
          } catch {}
        }

        // Upsert event record
        const eventRecord: any = {
          trip_id: tour.id,
          enabled: true,
          status: res.ok ? (tokenEvento ? "ATIVO" : "PENDENTE") : "ERRO",
          token_evento: tokenEvento,
          error_message: !res.ok ? `HTTP ${res.status}: ${resText.substring(0, 300)}` : null,
          raw_request: eventBody,
          raw_response: resData || resText.substring(0, 1000),
          last_sync_at: new Date().toISOString(),
        };

        if (existingEvent) {
          await supabaseAdmin.from("trip_roca_event").update(eventRecord).eq("id", existingEvent.id);
        } else {
          await supabaseAdmin.from("trip_roca_event").insert(eventRecord);
        }

        // Save participants locally
        for (const p of valid) {
          const cpf = p.dados.cpf.replace(/\D/g, "");
          await supabaseAdmin.from("trip_roca_participant").upsert(
            {
              trip_id: tour.id,
              cpf,
              nome: p.dados.nome,
              status: res.ok ? "ENVIADO" : "ERRO",
              sent_at: res.ok ? new Date().toISOString() : null,
              raw_request: p,
            },
            { onConflict: "trip_id,cpf" }
          );
        }

        // Log execution
        await supabaseAdmin.from("roca_execution_logs").insert({
          trip_id: tour.id,
          action: "auto_create_event",
          total_confirmed: allParticipants.length,
          total_sent: res.ok ? valid.length : 0,
          total_errors: res.ok ? 0 : valid.length,
          raw_request: eventBody,
          raw_response: resData || resText.substring(0, 1000),
        });

        results.push({
          tour: tour.name,
          success: res.ok,
          token_evento: tokenEvento,
          participants_sent: valid.length,
        });
      } else {
        // Event exists, just add new participants
        if (valid.length > 0) {
          for (let i = 0; i < valid.length; i += 20) {
            const batch = valid.slice(i, i + 20);
            const res = await fetch(`${ROCA_BASE_URL}/seguroAventuraParticipante/evento/${existingEvent.token_evento}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: settings.jwt_secret,
              },
              body: JSON.stringify({ participantes: batch }),
            });

            const resText = await res.text();
            for (const p of batch) {
              const cpf = p.dados.cpf.replace(/\D/g, "");
              await supabaseAdmin.from("trip_roca_participant").upsert(
                {
                  trip_id: tour.id,
                  cpf,
                  nome: p.dados.nome,
                  status: res.ok ? "ENVIADO" : "ERRO",
                  sent_at: res.ok ? new Date().toISOString() : null,
                  raw_request: p,
                },
                { onConflict: "trip_id,cpf" }
              );
            }
          }

          await supabaseAdmin.from("roca_execution_logs").insert({
            trip_id: tour.id,
            action: "auto_add_participants",
            total_confirmed: allParticipants.length,
            total_sent: valid.length,
          });
        }

        results.push({
          tour: tour.name,
          success: true,
          participants_sent: valid.length,
        });
      }
    }

    console.log("[Roca Auto] Completed. Results:", JSON.stringify(results));

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Roca Auto] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
