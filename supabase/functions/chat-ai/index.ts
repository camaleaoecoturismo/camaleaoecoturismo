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

const MONTH_ABBRS = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const months = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  return `${date.getDate()} de ${months[date.getMonth()]}`;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s{2,}/g, " ").trim();
}

function deriveTags(tour: any): string[] {
  const text = `${tour.name} ${tour.about ?? ""} ${tour.itinerary ?? ""} ${tour.includes ?? ""}`.toLowerCase();
  const tags: string[] = [];
  if (/cachoeira/.test(text)) tags.push("cachoeira");
  if (/trilha|caminhada|trekking/.test(text)) tags.push("trilha");
  if (/chapada|diamantina|len.is|vale do pati|mucug/.test(text)) tags.push("chapada");
  if (/c.nion|s.o francisco|piranhas/.test(text)) tags.push("cânion");
  if (/leve|tranquil|familiar|f.milia|bate.volta/.test(text)) tags.push("leve");
  if (/aventura|intenso|trekking|desafio/.test(text)) tags.push("aventura");
  if (/barco|flutuante|rio|lagoa/.test(text)) tags.push("natureza aquática");
  if (/rapel|tirolesa|rope jump/.test(text)) tags.push("adrenalina");
  if (/camping|acampamento/.test(text)) tags.push("camping");
  return tags;
}

async function buildData(tourSlug: string | null): Promise<{ context: string; toursMap: Map<string, TourCard>; adminInstructions: string }> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const today = new Date().toISOString().split("T")[0];

  const [toursRes, faqRes, instructionsRes, configRes] = await Promise.all([
    supabase
      .from("tours")
      .select("id, name, city, state, start_date, end_date, slug, about, itinerary, includes, not_includes, valor_padrao, image_url")
      .eq("is_active", true)
      .gte("start_date", today)
      .order("start_date", { ascending: true })
      .limit(40),
    supabase
      .from("faq_items")
      .select("pergunta, resposta, categoria")
      .order("display_order", { ascending: true })
      .limit(15),
    supabase
      .from("ai_instructions")
      .select("title, content, category")
      .eq("is_active", true)
      .order("priority", { ascending: false }),
    supabase
      .from("ai_agent_config")
      .select("key, label, value")
      .neq("value", ""),
  ]);

  const tours = toursRes.data;

  if (!tours || tours.length === 0) {
    return { context: "Nenhum passeio disponível no momento.", toursMap: new Map(), adminInstructions: "" };
  }

  const tourIds = (tours as any[]).map((t) => t.id);

  const [pricingRes, coversRes, boardingRes] = await Promise.all([
    supabase
      .from("tour_pricing_options")
      .select("tour_id, pix_price")
      .in("tour_id", tourIds),
    supabase
      .from("tour_gallery_images")
      .select("tour_id, image_url")
      .in("tour_id", tourIds)
      .eq("is_cover", true),
    supabase
      .from("pontos_embarque")
      .select("id, nome, endereco, tour_pontos_embarque!inner(tour_id)")
      .in("tour_pontos_embarque.tour_id", tourIds)
      .eq("ativo", true)
      .order("nome"),
  ]);

  const minPriceMap: Record<string, number> = {};
  for (const p of (pricingRes.data ?? []) as any[]) {
    if (!minPriceMap[p.tour_id] || p.pix_price < minPriceMap[p.tour_id]) {
      minPriceMap[p.tour_id] = p.pix_price;
    }
  }

  const coverMap: Record<string, string> = {};
  for (const c of (coversRes.data ?? []) as any[]) {
    coverMap[c.tour_id] = c.image_url;
  }

  const boardingMap: Record<string, string> = {};
  for (const ponto of (boardingRes.data ?? []) as any[]) {
    const linkedTourIds: string[] = (ponto.tour_pontos_embarque ?? []).map((j: any) => j.tour_id);
    const label = ponto.endereco ? `${ponto.nome} (${ponto.endereco})` : ponto.nome;
    for (const tid of linkedTourIds) {
      if (!boardingMap[tid]) boardingMap[tid] = label;
      else boardingMap[tid] += `, ${label}`;
    }
  }

  const toursMap = new Map<string, TourCard>();
  const contextLines: string[] = [];

  for (const tour of tours as any[]) {
    const slug = tour.slug || tour.id;
    const price = minPriceMap[tour.id] ?? tour.valor_padrao ?? null;
    const imageUrl = coverMap[tour.id] ?? tour.image_url ?? null;
    const tags = deriveTags(tour);
    const tourDate = new Date(tour.start_date + "T12:00:00");
    const monthAbbr = MONTH_ABBRS[tourDate.getMonth()];

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
        `SLUG: ${slug}`,
        `Nome: ${tour.name}`,
        `Local: ${[tour.city, tour.state].filter(Boolean).join(" - ")}`,
        `Data: ${formatDateShort(tour.start_date)}${endPart} (${monthAbbr})`,
        `Preço a partir de: ${price ? formatCurrency(price) : "Consulte"}`,
        boardingMap[tour.id] ? `Pontos de embarque: ${boardingMap[tour.id]}` : null,
        tags.length ? `Temas: ${tags.join(", ")}` : null,
        tour.about ? `Sobre: ${stripHtml(tour.about as string).slice(0, 250)}` : null,
        tour.itinerary ? `Roteiro: ${stripHtml(tour.itinerary as string).slice(0, 350)}` : null,
        tour.includes ? `Inclui: ${stripHtml(tour.includes as string).slice(0, 250)}` : null,
        tour.not_includes ? `Não inclui: ${stripHtml(tour.not_includes as string).slice(0, 200)}` : null,
        "---",
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  // Build FAQ section
  let faqSection = "";
  if (faqRes.data && faqRes.data.length > 0) {
    const faqLines = (faqRes.data as any[]).map((item) => {
      const resposta = stripHtml(item.resposta ?? "").slice(0, 220);
      return `[${item.categoria}] P: ${item.pergunta}\nR: ${resposta}`;
    });
    faqSection = "\n\nPERGUNTAS FREQUENTES:\n" + faqLines.join("\n---\n");
  }

  // Build admin instructions section
  const adminLines: string[] = [];

  // Config entries (free-text: extra context, seasonal notes, etc.)
  for (const cfg of (configRes.data ?? []) as any[]) {
    if (cfg.value && cfg.value.trim()) {
      adminLines.push(`[${cfg.label ?? cfg.key}]: ${cfg.value.trim()}`);
    }
  }

  // Individual instructions by category
  const categoryLabel: Record<string, string> = {
    regra: "REGRA",
    contexto: "CONTEXTO",
    comportamento: "COMPORTAMENTO",
    promocao: "PROMOÇÃO",
  };
  for (const inst of (instructionsRes.data ?? []) as any[]) {
    const label = categoryLabel[inst.category] ?? inst.category.toUpperCase();
    adminLines.push(`[${label}] ${inst.title}: ${inst.content.trim()}`);
  }

  const adminInstructions =
    adminLines.length > 0
      ? "INSTRUÇÕES PERSONALIZADAS DO ADMIN:\n" + adminLines.join("\n")
      : "";

  return { context: contextLines.join("\n") + faqSection, toursMap, adminInstructions };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, history = [], tourSlug = null, sessionId = null, deviceInfo = null } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ text: "Mensagem inválida.", tours: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { context, toursMap, adminInstructions } = await buildData(tourSlug);

    // Build tour-page context section if user is on a specific tour page
    let tourPageSection = "";
    if (tourSlug) {
      const focusedTour = toursMap.get(tourSlug);
      if (focusedTour) {
        tourPageSection = `\n\nCONTEXTO DA PÁGINA ATUAL:\nO usuário está na página do passeio "${focusedTour.name}" (slug: ${tourSlug}). Este é o passeio principal da conversa. Responda com foco nele, sem re-qualificar o perfil, a não ser que o usuário peça alternativas.`;
      }
    }

    const systemPrompt = `Você é a Camila, consultora de viagens da Camaleão Ecoturismo.
Converse como uma pessoa real: calorosa, direta e objetiva. Nunca robótica.

FORMATO DA RESPOSTA — sempre retorne JSON válido neste formato exato:
{
  "text": "sua resposta conversacional aqui",
  "tourSlugs": ["slug1", "slug2"],
  "options": ["Opção A", "Opção B"]
}
- "tourSlugs": slugs dos passeios a exibir como cards. Use [] se não há passeios para mostrar.
- "options": botões clicáveis de resposta rápida (máx. 4 itens, máx. 25 caracteres cada).
  OBRIGATÓRIO incluir options sempre que você fizer uma pergunta de escolha. Use [] só quando a pergunta for completamente aberta.

ESTILO:
- "text" com no máximo 4 frases curtas e diretas
- Faça UMA pergunta por vez
- Nunca liste nomes de passeios no "text" — os cards visuais cuidam disso
- Não use emojis em nenhuma parte da resposta
- Se há muitos passeios para mostrar, anuncia no texto (ex: "Encontrei 5 passeios para junho") e deixa os cards falar
- Linguagem suave, humana e comercial

ABORDAGEM TEMA-PRIMEIRO:
Quando o usuário mencionar um tema, destino ou tipo de passeio, siga esta ordem:
1. Mostre os cards relevantes IMEDIATAMENTE — nunca peça qualificação antes de mostrar resultados
2. Após mostrar os cards, faça NO MÁXIMO UMA pergunta suave para filtrar melhor, se houver muitas opções:
   - Para temas amplos ("próximas viagens", "o que tem"): pergunte o mês
     options: ["Este mês", "Próximo mês", "Ainda não sei"]
   - Para temas de perfil ("para famílias", "com crianças"): pergunte o grupo
     options: ["Só eu", "Casal", "Família", "Grupo"]
   - Para temas específicos (Chapada, cachoeiras, trilha): não pergunte nada — vá direto para as options de conversão
3. Nunca encadeie mais de 1 pergunta de qualificação antes de recomendar

COMPORTAMENTO POR TEMA:
- "próximas viagens" / "o que tem" / "ver passeios" → mostre os próximos 4-6 slugs por data + pergunte o mês
- "Chapada Diamantina" → mostre slugs da Chapada direto, sem qualificação prévia
- "cachoeira" / "trilha" → mostre slugs correspondentes direto
- "famílias" / "crianças" / "leve" → mostre slugs leves/familiares direto + pergunte tamanho do grupo
- "cancelamento" / "política" / "reembolso" / "taxa" / "multa" → NÃO explique as regras. Diga apenas que as políticas completas estão na página dedicada e inclua OBRIGATORIAMENTE [POLITICAS]. Nunca tente resumir ou detalhar condições.
- "preço" / "valor" / "quanto custa" → informe os valores dos passeios relevantes e formas de pagamento

Para mensagens livres sem tema claro: faça 1 pergunta para entender o interesse antes de recomendar.

APÓS RECOMENDAR PASSEIOS — sempre retorne exatamente estas options:
["Quero saber mais", "Como reservo?", "Ver agenda completa", "Ver outras opções"]

Quando o usuário escolher "Ver agenda completa", responda com [AGENDA] no texto para que o botão de redirecionamento apareça.

ESTÁGIO DE CONVERSÃO — quando o usuário demonstrar interesse claro em um passeio específico:
1. Mencione o(s) ponto(s) de embarque (use os "Pontos de embarque:" listados no contexto do SLUG)
2. Confirme o preço ("A partir de R$X no Pix")
3. Diga que pode reservar na página do passeio ou use [WHATSAPP] para o link de atendimento
4. options: ["Reservar agora", "Falar no WhatsApp", "Ver detalhes"]

COMPORTAMENTO EM PÁGINA DE PASSEIO ESPECÍFICO (quando CONTEXTO DA PÁGINA ATUAL estiver presente):
- Responda sobre aquele passeio diretamente, sem re-qualificar o perfil
- Ofereça proativamente: pontos de embarque, preço, como reservar
- Só sugira outros passeios se o usuário pedir explicitamente

REGRAS DE QUANTIDADE DE PASSEIOS:
- Perguntas sobre um mês específico (ex: "passeios de junho", "o que tem em julho") → inclua TODOS os slugs daquele mês
- Perguntas com filtro (cachoeira, trilha, chapada, família, etc.) → inclua TODOS os slugs que correspondem ao filtro
- Recomendação geral sem filtro específico → sugira 2 a 4 slugs mais adequados ao perfil
- Nunca omita passeios quando o usuário quer ver todos

PROVA SOCIAL (mencione quando relevante, não em toda mensagem):
- "mais de 5.000 viajantes já foram com a Camaleão"
- "prêmio melhor ecoturismo AL 2023"

EMPRESA:
- Nome: Camaleão Ecoturismo
- WhatsApp: use [WHATSAPP] para o botão de contato (nunca escreva o número)
- Instagram: @camaleaoecoturismo
- Localização: Maceió, Alagoas
- Fundada em 2020 por Isaías Christian (psicólogo e guia de turismo)
- Sócia: Paula Jatobá (advogada)
- Conquistas: +5000 viajantes, +25 roteiros, prêmio melhor ecoturismo AL 2023

PÁGINAS DO SITE — use o token correspondente no "text" para gerar um botão de navegação:
- [AGENDA] → catálogo completo de passeios
- [CHAPADA] → roteiros da Chapada Diamantina
- [FAQ] → perguntas frequentes sobre reservas, cancelamento, logística
- [POLITICAS] → políticas de cancelamento e termos de participação
- [SOBRE] → história da empresa e equipe
- [ORGANIZACOES] → grupos privativos, empresas e escolas
- [BLOG] → artigos e dicas de viagem

Use esses tokens SEMPRE que for indicar uma página do site. Nunca escreva a URL diretamente.

PASSEIOS DISPONÍVEIS (use APENAS estes slugs em "tourSlugs"):
${context}${tourPageSection}
${adminInstructions ? "\n" + adminInstructions + "\n" : ""}
REGRAS ABSOLUTAS:
- Só use slugs da lista acima — nunca invente
- Nunca coloque nomes ou datas de passeios no "text" se já incluiu em "tourSlugs"
- Nunca peça CPF, email ou telefone
- Use as PERGUNTAS FREQUENTES para responder diretamente — só direcione para /faq se a dúvida for muito específica
- Reservas existentes ou dados pessoais → use [WHATSAPP] no texto
- Nunca escreva o número de telefone no texto — use sempre [WHATSAPP] para o link de atendimento
- Para detalhes completos de um passeio, use os campos: Sobre, Roteiro, Inclui, Não inclui, Pontos de embarque
- Responda sobre roteiro, o que inclui e o que não inclui quando o usuário perguntar
- Para qualquer dúvida sobre cancelamento, reembolso ou políticas: NUNCA explique as regras no texto. Sempre use [POLITICAS] e diga para consultar a página`;

    const openaiMessages = [
      { role: "system", content: systemPrompt },
      ...(history as any[]).slice(-15),
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
        max_tokens: 600,
        temperature: 0.75,
        response_format: { type: "json_object" },
        messages: openaiMessages,
      }),
    });

    if (!openaiRes.ok) {
      console.error("OpenAI error:", await openaiRes.text());
      return new Response(
        JSON.stringify({ text: "Ops, tive um problema técnico. Tente novamente em instantes.", tours: [], options: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiData = await openaiRes.json();
    const raw = openaiData.choices?.[0]?.message?.content ?? "{}";

    let parsed: { text?: string; tourSlugs?: string[]; options?: string[] } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { text: raw };
    }

    const tours: TourCard[] = (parsed.tourSlugs ?? [])
      .map((slug: string) => toursMap.get(slug))
      .filter((t: TourCard | undefined): t is TourCard => !!t);

    const options: string[] = (parsed.options ?? [])
      .filter((o: any) => typeof o === "string" && o.trim().length > 0)
      .slice(0, 4);

    // Log conversation to DB (awaited — Deno kills fire-and-forget on return)
    if (sessionId && typeof sessionId === "string") {
      try {
        const logDb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const now = new Date().toISOString();
        const msgCount = (history as any[]).length + 2;

        await Promise.all([
          logDb.from("chat_sessions").upsert(
            {
              session_id: sessionId,
              tour_slug: tourSlug ?? null,
              last_activity: now,
              message_count: msgCount,
              ...(deviceInfo
                ? {
                    user_agent: (deviceInfo as any).userAgent ?? null,
                    device_type: (deviceInfo as any).deviceType ?? null,
                    browser: (deviceInfo as any).browser ?? null,
                    os: (deviceInfo as any).os ?? null,
                    screen_width: (deviceInfo as any).screenWidth ?? null,
                    screen_height: (deviceInfo as any).screenHeight ?? null,
                    language: (deviceInfo as any).language ?? null,
                    referrer: (deviceInfo as any).referrer ?? null,
                    first_page: (deviceInfo as any).firstPage ?? null,
                  }
                : {}),
            },
            { onConflict: "session_id" }
          ),
          logDb.from("chat_messages").insert({
            session_id: sessionId,
            role: "user",
            content: message,
            tour_slugs: null,
            options: null,
            created_at: now,
          }),
          logDb.from("chat_messages").insert({
            session_id: sessionId,
            role: "assistant",
            content: parsed.text ?? "",
            tour_slugs: tours.length > 0 ? tours.map((t: TourCard) => t.slug) : null,
            options: options.length > 0 ? options : null,
          }),
        ]);
      } catch (e) {
        console.error("chat log error:", e);
      }
    }

    return new Response(
      JSON.stringify({ text: parsed.text ?? "Como posso ajudar?", tours, options }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("chat-ai error:", error);
    return new Response(
      JSON.stringify({ text: "Ops, ocorreu um erro. Tente novamente.", tours: [], options: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
