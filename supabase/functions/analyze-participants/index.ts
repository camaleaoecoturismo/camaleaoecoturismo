import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function calcAge(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tourId } = await req.json();
    if (!tourId) throw new Error("tourId is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch tour info
    const { data: tour, error: tourError } = await supabase
      .from("tours")
      .select("id, name, city, state, start_date, end_date, vagas")
      .eq("id", tourId)
      .single();
    if (tourError) throw tourError;

    // Fetch ALL reservations for this tour
    const { data: reservas, error: resError } = await supabase
      .from("reservas")
      .select("id, status, payment_status, valor_passeio, valor_pago, valor_total_com_opcionais, numero_participantes, data_reserva, payment_method, ponto_embarque_id, cliente_id, problema_saude, descricao_problema_saude, observacoes, opcionais, adicionais")
      .eq("tour_id", tourId);
    if (resError) throw resError;

    // Identify CONFIRMED reservations
    const confirmedReservas = (reservas || []).filter(r =>
      ['confirmada', 'confirmado'].includes(r.status) &&
      ['pago', 'confirmed'].includes(r.payment_status)
    );
    const pendingReservas = (reservas || []).filter(r =>
      r.status === 'pendente' || r.payment_status === 'pendente'
    );

    // Fetch clients
    const clienteIds = [...new Set((reservas || []).map(r => r.cliente_id).filter(Boolean))];
    let clientes: any[] = [];
    if (clienteIds.length > 0) {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome_completo, cpf, email, whatsapp, data_nascimento, problema_saude, descricao_problema_saude, contato_emergencia_nome, contato_emergencia_telefone")
        .in("id", clienteIds);
      if (error) throw error;
      clientes = data || [];
    }

    // Fetch additional participants
    const reservaIds = (reservas || []).map(r => r.id);
    let participants: any[] = [];
    if (reservaIds.length > 0) {
      const { data, error } = await supabase
        .from("reservation_participants")
        .select("id, reserva_id, nome_completo, cpf, email, whatsapp, data_nascimento, problema_saude, descricao_problema_saude, nivel_condicionamento, contato_emergencia_nome, contato_emergencia_telefone, is_staff, staff_role, ponto_embarque_id, ponto_embarque_personalizado, participant_index, como_conheceu, assistencia_diferenciada, descricao_assistencia_diferenciada")
        .in("reserva_id", reservaIds);
      if (error) throw error;
      participants = data || [];
    }

    // Fetch boarding points
    const { data: boardingPoints } = await supabase
      .from("tour_boarding_points")
      .select("id, nome, endereco")
      .eq("tour_id", tourId);

    // ── PRE-CALCULATE METRICS SERVER-SIDE ──
    const confirmedReservaIds = new Set(confirmedReservas.map(r => r.id));
    const confirmedParticipants = participants.filter(p => confirmedReservaIds.has(p.reserva_id) && !p.is_staff);
    const staffMembers = participants.filter(p => p.is_staff);

    // Count confirmed: sum of numero_participantes from confirmed reservations + staff
    const totalConfirmedFromReservas = confirmedReservas.reduce((sum, r) => sum + (r.numero_participantes || 0), 0);
    const totalStaff = staffMembers.length;
    const totalConfirmed = totalConfirmedFromReservas;
    const vagasTotais = tour.vagas || 0;
    const occupancyPercent = vagasTotais > 0 ? Math.round((totalConfirmed / vagasTotais) * 100) : 0;

    // Revenue
    const totalPaid = confirmedReservas.reduce((sum, r) => sum + (r.valor_pago || 0), 0);
    const totalExpected = confirmedReservas.reduce((sum, r) => sum + (r.valor_total_com_opcionais || r.valor_passeio || 0), 0);
    const pendingPayment = (reservas || []).filter(r => r.payment_status === 'pendente').reduce((sum, r) => sum + (r.valor_total_com_opcionais || r.valor_passeio || 0), 0);

    // CPF duplicates (only among confirmed) — use a single source to avoid double-counting
    // Collect from reservation_participants (which includes titulars at index 0)
    // Only fall back to clientes table if no participants exist for a reservation
    const confirmedCpfs: string[] = [];
    const reservasWithParticipants = new Set(confirmedParticipants.map(p => p.reserva_id));
    for (const r of confirmedReservas) {
      if (!reservasWithParticipants.has(r.id)) {
        // No separate participants — use client CPF
        const c = clientes.find(cl => cl.id === r.cliente_id);
        if (c?.cpf) confirmedCpfs.push(c.cpf.replace(/[^0-9]/g, ''));
      }
    }
    for (const p of confirmedParticipants) {
      if (p.cpf) confirmedCpfs.push(p.cpf.replace(/[^0-9]/g, ''));
    }
    const cpfCounts: Record<string, number> = {};
    for (const cpf of confirmedCpfs) {
      if (cpf) cpfCounts[cpf] = (cpfCounts[cpf] || 0) + 1;
    }
    const duplicateCpfs = Object.entries(cpfCounts).filter(([, c]) => c > 1).map(([cpf, count]) => ({ cpf, count }));

    // Age distribution
    const ages: number[] = [];
    for (const r of confirmedReservas) {
      const c = clientes.find(cl => cl.id === r.cliente_id);
      const age = calcAge(c?.data_nascimento);
      if (age !== null) ages.push(age);
    }
    for (const p of confirmedParticipants) {
      const age = calcAge(p.data_nascimento);
      if (age !== null) ages.push(age);
    }
    const ageRanges = { '0-17': 0, '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '56+': 0 };
    for (const a of ages) {
      if (a < 18) ageRanges['0-17']++;
      else if (a <= 25) ageRanges['18-25']++;
      else if (a <= 35) ageRanges['26-35']++;
      else if (a <= 45) ageRanges['36-45']++;
      else if (a <= 55) ageRanges['46-55']++;
      else ageRanges['56+']++;
    }

    // Health issues
    const healthIssues = confirmedParticipants.filter(p => p.problema_saude).length +
      confirmedReservas.filter(r => r.problema_saude).length;

    // Boarding point distribution
    const bpMap: Record<string, number> = {};
    for (const r of confirmedReservas) {
      const bp = (boardingPoints || []).find(b => b.id === r.ponto_embarque_id);
      const name = bp?.nome || 'Não definido';
      bpMap[name] = (bpMap[name] || 0) + (r.numero_participantes || 1);
    }

    // Payment methods
    const paymentMethods: Record<string, number> = {};
    for (const r of confirmedReservas) {
      const method = r.payment_method || 'Não informado';
      paymentMethods[method] = (paymentMethods[method] || 0) + 1;
    }

    // Conditioning levels
    const condLevels: Record<string, number> = {};
    for (const p of confirmedParticipants) {
      if (p.nivel_condicionamento) {
        const level = p.nivel_condicionamento.split(' - ')[0] || p.nivel_condicionamento;
        condLevels[level] = (condLevels[level] || 0) + 1;
      }
    }

    // Como conheceu
    const comoConheceu: Record<string, number> = {};
    for (const p of confirmedParticipants) {
      if (p.como_conheceu) {
        comoConheceu[p.como_conheceu] = (comoConheceu[p.como_conheceu] || 0) + 1;
      }
    }

    // Missing data among confirmed
    const missingData: string[] = [];
    for (const r of confirmedReservas) {
      const c = clientes.find(cl => cl.id === r.cliente_id);
      if (c) {
        if (!c.email) missingData.push(`${c.nome_completo}: sem email`);
        if (!c.whatsapp) missingData.push(`${c.nome_completo}: sem WhatsApp`);
        if (!c.data_nascimento) missingData.push(`${c.nome_completo}: sem data de nascimento`);
        if (!c.contato_emergencia_nome) missingData.push(`${c.nome_completo}: sem contato de emergência`);
      }
    }
    for (const p of confirmedParticipants) {
      if (!p.nome_completo) missingData.push(`Participante sem nome (reserva ${p.reserva_id})`);
      if (!p.cpf) missingData.push(`${p.nome_completo || 'Participante'}: sem CPF`);
    }

    // Build pre-calculated metrics object
    const metrics = {
      vagas_totais: vagasTotais,
      participantes_confirmados: totalConfirmed,
      equipe_staff: totalStaff,
      ocupacao_percentual: occupancyPercent,
      total_reservas: (reservas || []).length,
      reservas_confirmadas: confirmedReservas.length,
      reservas_pendentes: pendingReservas.length,
      valor_total_arrecadado: totalPaid,
      valor_total_esperado: totalExpected,
      valor_pendente: pendingPayment,
      cpfs_duplicados_entre_confirmados: duplicateCpfs,
      distribuicao_faixa_etaria: ageRanges,
      participantes_com_problema_saude: healthIssues,
      distribuicao_pontos_embarque: bpMap,
      metodos_pagamento: paymentMethods,
      niveis_condicionamento: condLevels,
      como_conheceu: comoConheceu,
      dados_faltantes_confirmados: missingData,
    };

    // Build context with raw + pre-calculated data
    const dataContext = JSON.stringify({
      metricas_pre_calculadas: metrics,
      tour: {
        nome: tour.name,
        cidade: tour.city,
        estado: tour.state,
        data_inicio: tour.start_date,
        data_fim: tour.end_date,
        vagas_totais: tour.vagas,
      },
      reservas_confirmadas: confirmedReservas.map(r => {
        const cliente = clientes.find(c => c.id === r.cliente_id);
        return {
          status: r.status,
          payment_status: r.payment_status,
          payment_method: r.payment_method,
          valor_passeio: r.valor_passeio,
          valor_pago: r.valor_pago,
          numero_participantes: r.numero_participantes,
          data_reserva: r.data_reserva,
          problema_saude: r.problema_saude,
          descricao_problema_saude: r.descricao_problema_saude,
          observacoes: r.observacoes,
          opcionais: r.opcionais,
          adicionais: r.adicionais,
          cliente: cliente ? {
            nome: cliente.nome_completo,
            cpf: cliente.cpf,
            email: cliente.email,
            whatsapp: cliente.whatsapp,
            data_nascimento: cliente.data_nascimento,
            problema_saude: cliente.problema_saude,
            descricao_problema_saude: cliente.descricao_problema_saude,
            contato_emergencia: cliente.contato_emergencia_nome ? `${cliente.contato_emergencia_nome} - ${cliente.contato_emergencia_telefone}` : null,
          } : null,
        };
      }),
      participantes_confirmados: confirmedParticipants.map(p => ({
        nome: p.nome_completo,
        cpf: p.cpf,
        email: p.email,
        whatsapp: p.whatsapp,
        data_nascimento: p.data_nascimento,
        problema_saude: p.problema_saude,
        descricao_problema_saude: p.descricao_problema_saude,
        nivel_condicionamento: p.nivel_condicionamento,
        como_conheceu: p.como_conheceu,
        assistencia_diferenciada: p.assistencia_diferenciada,
        descricao_assistencia_diferenciada: p.descricao_assistencia_diferenciada,
        ponto_embarque_personalizado: p.ponto_embarque_personalizado,
      })),
      reservas_pendentes: pendingReservas.map(r => {
        const cliente = clientes.find(c => c.id === r.cliente_id);
        return {
          status: r.status,
          payment_status: r.payment_status,
          valor_passeio: r.valor_passeio,
          cliente_nome: cliente?.nome_completo,
        };
      }),
      equipe: staffMembers.map(s => ({ nome: s.nome_completo, funcao: s.staff_role })),
      pontos_embarque: (boardingPoints || []).map(bp => ({ nome: bp.nome, endereco: bp.endereco })),
    }, null, 0);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um auditor de dados + analista estratégico + consultor operacional especializado em turismo de aventura e ecoturismo.

Analise os dados dos participantes de um passeio e gere um relatório completo em português do Brasil.

DADOS PRÉ-CALCULADOS (USE ESTES NÚMEROS, NÃO RECALCULE):
As métricas em "metricas_pre_calculadas" já foram calculadas pelo servidor com precisão. USE-AS DIRETAMENTE. Não tente recontar participantes, reservas ou ocupação — os números pré-calculados são a verdade absoluta.

FORMATO DE SAÍDA (use markdown):

## 📋 Resumo Executivo
Um parágrafo em linguagem natural, como um relatório de consultoria, resumindo a situação geral desta viagem. Use EXATAMENTE os números de metricas_pre_calculadas.participantes_confirmados e metricas_pre_calculadas.vagas_totais para ocupação.

## ⚠️ Problemas Encontrados
Lista de problemas com classificação:
- 🔴 **CRÍTICO**: problemas que podem impedir a viagem
- 🟡 **ATENÇÃO**: problemas que precisam de correção
- 🟢 **MENOR**: melhorias recomendadas

Se não houver problemas, diga explicitamente.

## 📊 Padrões Detectados
Use os dados de metricas_pre_calculadas para identificar padrões como:
- Faixas etárias predominantes (use distribuicao_faixa_etaria)
- Distribuição por pontos de embarque (use distribuicao_pontos_embarque)
- Métodos de pagamento mais usados (use metodos_pagamento)
- Como conheceram o passeio (use como_conheceu)
- Grupos que reservaram juntos

## 👥 Perfil do Público
- Faixa etária (use distribuicao_faixa_etaria)
- Problemas de saúde (use participantes_com_problema_saude)
- Níveis de condicionamento (use niveis_condicionamento)
- Como conheceram (use como_conheceu)

## 🚨 Alertas Importantes
Alertas operacionais que o gestor precisa saber ANTES da viagem. Use os dados de dados_faltantes_confirmados.

## 💡 Recomendações
Ações práticas e específicas, organizadas por prioridade.

REGRAS:
- USE os números pré-calculados. NÃO recalcule.
- Não invente dados. Baseie-se APENAS nos dados fornecidos.
- Seja direto e prático.
- Se dados insuficientes para uma seção, diga "Dados insuficientes."
- Nunca confunda reservas com participantes.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analise os seguintes dados do passeio "${tour.name}":\n\n${dataContext}` },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes para análise IA." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return both stream and metrics
    // We'll send metrics as the first SSE event, then pipe the AI stream
    const encoder = new TextEncoder();
    const metricsEvent = `data: ${JSON.stringify({ type: "metrics", data: metrics })}\n\n`;

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // Write metrics first, then pipe AI stream
    (async () => {
      try {
        await writer.write(encoder.encode(metricsEvent));
        const reader = response.body!.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }
      } catch (e) {
        console.error("Stream error:", e);
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("analyze-participants error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
