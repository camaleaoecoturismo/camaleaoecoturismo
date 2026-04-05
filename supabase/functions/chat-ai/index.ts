import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const months = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function buildToursContext(): Promise<string> {
  // Uses anon key — respects RLS, only public data accessible
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const today = new Date().toISOString().split("T")[0];

  const { data: tours } = await supabase
    .from("tours")
    .select("id, name, city, state, start_date, end_date, slug, about, itinerary, includes, not_includes, what_to_bring, valor_padrao, vagas")
    .eq("is_active", true)
    .gte("start_date", today)
    .order("start_date", { ascending: true })
    .limit(30);

  if (!tours || tours.length === 0) {
    return "Nenhum passeio disponível no momento.";
  }

  // Fetch pricing options for these tours
  const tourIds = tours.map((t: any) => t.id);
  const { data: pricingOptions } = await supabase
    .from("tour_pricing_options")
    .select("tour_id, option_name, pix_price")
    .in("tour_id", tourIds);

  const pricingMap: Record<string, { option_name: string; pix_price: number }[]> = {};
  (pricingOptions || []).forEach((p: any) => {
    if (!pricingMap[p.tour_id]) pricingMap[p.tour_id] = [];
    pricingMap[p.tour_id].push(p);
  });

  const lines: string[] = [];

  for (const tour of tours as any[]) {
    const endPart = tour.end_date && tour.end_date !== tour.start_date
      ? ` até ${formatDate(tour.end_date)}`
      : "";
    const location = [tour.city, tour.state].filter(Boolean).join(" - ");
    const pricing = pricingMap[tour.id];
    let priceStr = "";
    if (pricing && pricing.length > 0) {
      priceStr = pricing.map((p) => `${p.option_name}: ${formatCurrency(p.pix_price)}`).join(" | ");
    } else if (tour.valor_padrao) {
      priceStr = formatCurrency(tour.valor_padrao);
    }

    lines.push(`
PASSEIO: ${tour.name}
Local: ${location}
Data: ${formatDate(tour.start_date)}${endPart}
Preço (PIX): ${priceStr || "Consulte"}
Vagas: ${tour.vagas ?? "Consulte"}
Página: /passeio/${tour.slug || tour.id}
${tour.about ? `Descrição: ${tour.about}` : ""}
${tour.includes ? `Incluso: ${tour.includes}` : ""}
${tour.not_includes ? `Não incluso: ${tour.not_includes}` : ""}
${tour.what_to_bring ? `O que levar: ${tour.what_to_bring}` : ""}
${tour.itinerary ? `Roteiro: ${tour.itinerary}` : ""}
---`);
  }

  return lines.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, history = [] } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toursContext = await buildToursContext();

    const systemPrompt = `Você é a Cami, assistente virtual da Camaleão Ecoturismo.
Sua missão é ajudar visitantes a encontrar o passeio ideal, tirar dúvidas sobre datas e preços, e orientar sobre como reservar.

Responda sempre em português brasileiro, de forma amigável, direta e empolgante.
Máximo 3 parágrafos por resposta. Use emojis com moderação.

═══ PASSEIOS DISPONÍVEIS ═══
${toursContext}

═══ COMO RESERVAR ═══
Pelo site: acesse a página do passeio (link informado acima) e clique em "Reservar".
Pelo WhatsApp: (82) 99364-9454

═══ REGRAS ═══
- Só mencione passeios que estão na lista acima com datas e preços reais
- Nunca invente preços, datas ou informações
- Para reservas, direcione para a página do passeio ou WhatsApp
- Se não souber responder, diga que vai conectar com a equipe humana
- Não fale de concorrentes
- Nunca peça nem armazene dados pessoais (CPF, nome completo, telefone, email)
- Se alguém perguntar sobre sua própria reserva ou dados pessoais, redirecione para o WhatsApp`;

    // Keep last 10 messages to control token usage
    const recentHistory = history.slice(-10);

    const openaiMessages = [
      { role: "system", content: systemPrompt },
      ...recentHistory,
      { role: "user", content: message },
    ];

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        stream: true,
        max_tokens: 600,
        temperature: 0.7,
        messages: openaiMessages,
      }),
    });

    if (!openaiResponse.ok) {
      const err = await openaiResponse.text();
      console.error("OpenAI error:", err);
      return new Response(JSON.stringify({ error: "OpenAI request failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stream the OpenAI SSE response back to the client
    return new Response(openaiResponse.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("chat-ai error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
