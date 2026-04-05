import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

interface TourCard {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  startDate: string;
  endDate: string | null;
  price: number | null;
  imageUrl: string | null;
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const months = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  return `${date.getDate()} de ${months[date.getMonth()]}`;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

function deriveTags(tour: any): string[] {
  const text = `${tour.name} ${tour.about ?? ""} ${tour.itinerary ?? ""} ${tour.includes ?? ""}`.toLowerCase();
  const tags: string[] = [];
  if (/cachoeira/.test(text)) tags.push("cachoeira");
  if (/trilha|caminhada|trekking/.test(text)) tags.push("trilha");
  if (/chapada|diamantina|len.is|vale do pati|mucug/.test(text)) tags.push("chapada");
  if (/c.nion|s.o francisco|piranhas/.test(text)) tags.push("canion");
  if (/leve|tranquil|familiar|f.milia|bate.volta/.test(text)) tags.push("leve");
  if (/aventura|intenso|trekking|desafio/.test(text)) tags.push("aventura");
  if (/barco|flutuante|rio|lagoa/.test(text)) tags.push("natureza aquática");
  return tags;
}

async function buildData(): Promise<{ context: string; toursMap: Map<string, TourCard> }> {
  // Anon key only — RLS ensures no private data is accessible
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const today = new Date().toISOString().split("T")[0];
  const currentMonthPrefix = today.substring(0, 7); // "2026-04"

  const { data: tours } = await supabase
    .from("tours")
    .select("id, name, city, state, start_date, end_date, slug, about, itinerary, includes, not_includes, valor_padrao, image_url")
    .eq("is_active", true)
    .gte("start_date", today)
    .order("start_date", { ascending: true })
    .limit(40);

  if (!tours || tours.length === 0) {
    return { context: "Nenhum passeio disponível no momento.", toursMap: new Map() };
  }

  const tourIds = (tours as any[]).map((t) => t.id);

  const [pricingRes, coversRes] = await Promise.all([
    supabase
      .from("tour_pricing_options")
      .select("tour_id, pix_price")
      .in("tour_id", tourIds),
    supabase
      .from("tour_gallery_images")
      .select("tour_id, image_url")
      .in("tour_id", tourIds)
      .eq("is_cover", true),
  ]);

  // Minimum price per tour
  const minPriceMap: Record<string, number> = {};
  for (const p of (pricingRes.data ?? []) as any[]) {
    if (!minPriceMap[p.tour_id] || p.pix_price < minPriceMap[p.tour_id]) {
      minPriceMap[p.tour_id] = p.pix_price;
    }
  }

  // Cover image per tour
  const coverMap: Record<string, string> = {};
  for (const c of (coversRes.data ?? []) as any[]) {
    coverMap[c.tour_id] = c.image_url;
  }

  const toursMap = new Map<string, TourCard>();
  const contextLines: string[] = [];

  for (const tour of tours as any[]) {
    const slug = tour.slug || tour.id;
    const price = minPriceMap[tour.id] ?? tour.valor_padrao ?? null;
    const imageUrl = coverMap[tour.id] ?? tour.image_url ?? null;
    const tags = deriveTags(tour);
    const isThisMonth = (tour.start_date as string).startsWith(currentMonthPrefix);

    toursMap.set(slug, {
      id: tour.id,
      name: tour.name,
      slug,
      city: tour.city ?? "",
      state: tour.state ?? "",
      startDate: tour.start_date,
      endDate: tour.end_date ?? null,
      price,
      imageUrl,
    });

    const endPart =
      tour.end_date && tour.end_date !== tour.start_date
        ? ` a ${formatDateShort(tour.end_date)}`
        : "";

    contextLines.push(
      [
        `SLUG: ${slug}${isThisMonth ? " [ESTE MÊS]" : ""}`,
        `Nome: ${tour.name}`,
        `Local: ${[tour.city, tour.state].filter(Boolean).join(" - ")}`,
        `Data: ${formatDateShort(tour.start_date)}${endPart}`,
        `Preço a partir de: ${price ? formatCurrency(price) : "Consulte"}`,
        tags.length ? `Temas: ${tags.join(", ")}` : null,
        tour.about ? `Sobre: ${(tour.about as string).slice(0, 180)}` : null,
        "---",
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  return { context: contextLines.join("\n"), toursMap };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, history = [] } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ text: "Mensagem inválida.", tours: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { context, toursMap } = await buildData();

    const systemPrompt = `Você é a Camila, consultora de viagens da Camaleão Ecoturismo.
Converse como uma pessoa real: calorosa, direta, objetiva. Nunca robótica.

FORMATO DA RESPOSTA — sempre retorne JSON válido neste formato exato:
{
  "text": "sua resposta conversacional aqui",
  "tourSlugs": ["slug1", "slug2"]
}
Use "tourSlugs" para indicar passeios a exibir como cards visuais. Se não há passeios para mostrar, use [].

ESTILO:
- "text" com no máximo 3 frases curtas e diretas
- Faça UMA pergunta por vez
- Nunca liste passeios no "text" — os cards visuais cuidam disso
- Máximo 1 emoji por resposta
- Linguagem suave, humana e comercial

FUNIL DE ATENDIMENTO:
1. ENTENDER — descubra o perfil antes de recomendar. Pergunte uma coisa de cada vez: o que busca, data, quem vai.
2. RECOMENDAR — sugira 1 a 3 slugs via "tourSlugs". No "text", explique brevemente por que combinam com o perfil.
3. CONVERTER — quando houver interesse claro, diga que pode reservar na página do passeio ou pelo WhatsApp (82) 99364-9454.

PASSEIOS DISPONÍVEIS (use APENAS estes slugs em "tourSlugs"):
${context}

REGRAS ABSOLUTAS:
- Só use slugs da lista acima — nunca invente
- Nunca coloque dados de passeios no "text" se já incluiu em "tourSlugs"
- Nunca peça CPF, email ou telefone
- Reservas existentes ou dados pessoais → WhatsApp`;

    const openaiMessages = [
      { role: "system", content: systemPrompt },
      ...(history as any[]).slice(-10),
      { role: "user", content: message },
    ];

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 400,
        temperature: 0.75,
        response_format: { type: "json_object" },
        messages: openaiMessages,
      }),
    });

    if (!openaiRes.ok) {
      console.error("OpenAI error:", await openaiRes.text());
      return new Response(
        JSON.stringify({ text: "Ops, tive um problema técnico. Tente novamente em instantes 😊", tours: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiData = await openaiRes.json();
    const raw = openaiData.choices?.[0]?.message?.content ?? "{}";

    let parsed: { text?: string; tourSlugs?: string[] } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { text: raw };
    }

    const tours: TourCard[] = (parsed.tourSlugs ?? [])
      .map((slug: string) => toursMap.get(slug))
      .filter((t: TourCard | undefined): t is TourCard => !!t);

    return new Response(
      JSON.stringify({ text: parsed.text ?? "Como posso ajudar?", tours }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("chat-ai error:", error);
    return new Response(
      JSON.stringify({ text: "Ops, ocorreu um erro. Tente novamente 😊", tours: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
