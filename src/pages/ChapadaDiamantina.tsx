import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TopMenu } from "@/components/TopMenu";
import { FloatingContactButton } from "@/components/FloatingContactButton";
import { TourModal } from "@/components/TourModal";
import { ReservaModal } from "@/components/ReservaModal";
import { WaitlistModal } from "@/components/WaitlistModal";
import { useTours, Tour } from "@/hooks/useTours";
import { useTourCoverImages } from "@/hooks/useTourCoverImages";
import { supabase } from "@/integrations/supabase/client";
import logoImage from "@/assets/logo.png";
import {
  Mountain,
  Users,
  Calendar,
  MapPin,
  Star,
  CheckCircle2,
  ArrowRight,
  MessageCircle,
  Backpack,
  Flame,
  Footprints,
  ChevronDown,
  AlertTriangle,
  X,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const WA_NUMBER = "5582993649454";
const waLink = (msg: string) =>
  `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;

// SEO
document.title = "Chapada Diamantina | Camaleão Ecoturismo";

// ─── Difficulty badge ─────────────────────────────────────────────────────────
const diffConfig: Record<string, { bg: string; label: string }> = {
  Fácil: { bg: "bg-green-100 text-green-800 border-green-200", label: "Fácil" },
  Moderado: { bg: "bg-yellow-100 text-yellow-800 border-yellow-200", label: "Moderado" },
  "Moderado-Intenso": {
    bg: "bg-orange-100 text-orange-800 border-orange-200",
    label: "Moderado-Intenso",
  },
  Intenso: { bg: "bg-red-100 text-red-800 border-red-200", label: "Intenso" },
};
const DiffBadge = ({ level }: { level: string }) => {
  const cfg = diffConfig[level] ?? diffConfig["Moderado"];
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.bg}`}>
      {cfg.label}
    </span>
  );
};

// ─── Static data ──────────────────────────────────────────────────────────────
const roteiros = [
  {
    id: "lencois",
    nome: "Lençóis",
    tagline: "A primeira grande imersão na Chapada",
    perfil: "Primeira viagem, grupos variados, contemplação + aventura",
    nivel: "Moderado" as const,
    dias: 4,
    hospedagem: "Pousada em Lençóis",
    experiencia: "Variedade e equilíbrio",
    destaque: "Mais popular",
    cor: "from-emerald-500 to-teal-600",
    atrativos: [
      { nome: "Morro do Pai Inácio", desc: "1120m de altitude, cartão-postal da Chapada com vista de 360°.", nivel: "Fácil", km: "2km" },
      { nome: "Poço Azul", desc: "Caverna alagada com águas intensamente azuis. Flutuação com snorkel.", nivel: "Fácil", km: "—" },
      { nome: "Fazenda Pratinha", desc: "TOP 3 da Chapada. Gruta Azul, tirolesa e flutuação com tartarugas.", nivel: "Fácil", km: "—" },
      { nome: "Gruta da Lapa Doce", desc: "Segunda maior gruta do Brasil, com estalactites milenares.", nivel: "Fácil-Moderado", km: "4km" },
      { nome: "Ribeirão do Meio", desc: "Tobogã natural em pedra com piscina cristalina. Diversão garantida.", nivel: "Fácil", km: "7km" },
      { nome: "Poço do Diabo", desc: "Cachoeira de 20m com tirolesa e rapel para os aventureiros.", nivel: "Fácil", km: "3km" },
      { nome: "Cachoeira do Mosquito", desc: "70m de queda em paredão rochoso. Uma das mais acessíveis.", nivel: "Fácil", km: "2km" },
    ],
    programacao: [
      { dia: 1, label: "Embarque e chegada", nivel: "Leve", itens: ["Saída no período da tarde/noite", "Chegada a Lençóis", "Acomodação e orientações do guia"] },
      { dia: 2, label: "Grutas e poços", nivel: "Moderado", itens: ["Gruta da Lapa Doce", "Poço Azul", "Tarde livre em Lençóis"] },
      { dia: 3, label: "Fazenda e tobogã", nivel: "Fácil", itens: ["Fazenda Pratinha (Gruta Azul + tirolesa)", "Ribeirão do Meio"] },
      { dia: 4, label: "Clássicos e retorno", nivel: "Moderado", itens: ["Morro do Pai Inácio", "Poço do Diabo", "Embarque de retorno"] },
    ],
    incluso: [
      "Transporte ida e volta (2 motoristas)",
      "3 diárias em pousada",
      "Café da manhã nos 3 dias",
      "Guia local nativo experiente",
      "Guia de turismo credenciado",
      "Deslocamento entre atrativos",
      "Cobertura fotográfica",
      "Seguro Aventura",
      "Pulseira de identificação",
      "Lanches na viagem",
    ],
    naoIncluso: [
      "Almoços e jantares",
      "Entradas dos atrativos (ver abaixo)",
      "Bebidas e lanches extras",
      "Gastos pessoais",
    ],
    entradas: [
      "Poço Azul: R$ 60",
      "Gruta da Lapa Doce: R$ 80",
      "Fazenda Pratinha: R$ 90",
      "Ribeirão do Meio: R$ 20",
    ],
    levar: [
      "Tênis de trilha ou calçado fechado confortável",
      "Roupa de banho e toalha",
      "Protetor solar e repelente",
      "Mochila pequena (daypack) para os passeios",
      "Garrafa d'água de pelo menos 1L",
      "Lanche para os dias de trilha",
      "Dinheiro em espécie para entradas",
    ],
  },
  {
    id: "valedopati",
    nome: "Vale do Pati",
    tagline: "Travessia de 3 dias no coração da Chapada",
    perfil: "Aventureiros com preparo físico, buscam imersão total",
    nivel: "Intenso" as const,
    dias: 3,
    hospedagem: "Casa de nativo no vale",
    experiencia: "Imersão e desconexão",
    destaque: null,
    cor: "from-blue-500 to-indigo-600",
    atrativos: [
      { nome: "Mirante do Pati", desc: "Vista panorâmica do vale inteiro. Um dos mirantes mais impressionantes do Brasil.", nivel: "Intenso", km: "14km" },
      { nome: "Morro do Castelo", desc: "Formação rochosa imponente com acesso por trilha técnica.", nivel: "Intenso", km: "16km" },
      { nome: "Cachoeira da Bananeira", desc: "Cachoeira com poço para banho após o dia mais intenso da travessia.", nivel: "Moderado", km: "inclusa" },
      { nome: "Funil", desc: "Ponto estreito do vale com vista única das paredes rochosas.", nivel: "Moderado", km: "inclusa" },
      { nome: "Lajeado", desc: "Laje de pedra com vista do vale para descanso e contemplação.", nivel: "Fácil", km: "inclusa" },
    ],
    programacao: [
      { dia: 1, label: "Entrada no vale", nivel: "Intenso", itens: ["Chegada à entrada do Vale do Pati", "Trilha até o Mirante do Pati (~14km)", "Pernoite em casa de nativo"] },
      { dia: 2, label: "Coração da travessia", nivel: "Intenso", itens: ["Morro do Castelo", "Cachoeira da Bananeira", "Funil + Lajeado (~16km)", "Pernoite em casa de nativo"] },
      { dia: 3, label: "Saída pelo Aleixo", nivel: "Moderado", itens: ["Cachoeira local pela manhã", "Trilha de saída pelo Aleixo (~12km)", "Retorno"] },
    ],
    incluso: [
      "Transporte até a entrada do vale",
      "2 pernoites em casa de nativo",
      "Refeições completas no vale (pensão completa)",
      "Guia especializado no Pati",
      "Guia de turismo credenciado",
      "Cobertura fotográfica",
      "Seguro Aventura",
    ],
    naoIncluso: [
      "Transporte de mochila opcional (burro de carga)",
      "Gastos pessoais",
      "Taxa de entrada do Parque Nacional",
    ],
    entradas: [
      "Taxa Parque Nacional: R$ 30",
      "Transporte de mochila (opcional): ~R$ 80",
    ],
    atencao: [
      "Pernoite em casa de nativo — sem conforto de pousada",
      "Caminhadas em dias consecutivos (14–16km/dia)",
      "Sem sinal de celular no interior do vale",
      "Preparo físico mínimo é exigido",
    ],
    levar: [
      "Mochila cargueira (45-60L) para a travessia",
      "Bota de trilha com suporte para tornozelo",
      "Saco de dormir leve",
      "Roupas para frio (noites frescas no vale)",
      "Lanterna ou headlamp",
      "Kit de primeiros socorros básico",
      "Garrafa d'água de 2L",
      "Snacks de alto teor calórico",
    ],
  },
  {
    id: "mucuge",
    nome: "Mucugê",
    tagline: "Cachoeiras marcantes e base histórica no sul da Chapada",
    perfil: "Quem quer cachoeiras intensas, trilhas variadas e história",
    nivel: "Moderado-Intenso" as const,
    dias: 3,
    hospedagem: "Pousada histórica em Mucugê",
    experiencia: "Natureza bruta + patrimônio",
    destaque: null,
    cor: "from-amber-500 to-orange-600",
    atrativos: [
      { nome: "Cachoeira da Fumacinha", desc: "340m de queda — uma das mais altas do Brasil. Trilha de 14km, exigente e recompensadora.", nivel: "Difícil", km: "14km" },
      { nome: "Cachoeira do Buracão", desc: "85m de queda dentro de um cânion impressionante. Imperdível!", nivel: "Moderado", km: "6km" },
      { nome: "Cachoeira da Fumegante", desc: "Névoa constante que parece fumaça. Cenário surreal e fotogênico.", nivel: "Moderado", km: "4km" },
      { nome: "Cemitério Bizantino", desc: "Único no Brasil, com arquitetura singular e vista panorâmica da cidade histórica.", nivel: "Fácil", km: "—" },
      { nome: "Cachoeira do Tiburtino", desc: "Cachoeira próxima à cidade, perfeita para banho no dia de chegada.", nivel: "Fácil", km: "2km" },
    ],
    programacao: [
      { dia: 1, label: "Chegada e aquecimento", nivel: "Leve", itens: ["Chegada a Mucugê", "Cachoeira do Tiburtino", "Visita à cidade histórica"] },
      { dia: 2, label: "Dia de intensidade", nivel: "Intenso", itens: ["Cachoeira da Fumacinha (trilha 14km)", "ou Cachoeira do Buracão (6km) conforme grupo"] },
      { dia: 3, label: "Patrimônio e retorno", nivel: "Leve", itens: ["Cemitério Bizantino", "Cachoeira da Fumegante", "Retorno"] },
    ],
    incluso: [
      "Transporte ida e volta",
      "2 diárias em pousada histórica",
      "Café da manhã",
      "Guia local especializado",
      "Deslocamento interno entre atrativos",
      "Cobertura fotográfica",
      "Seguro Aventura",
    ],
    naoIncluso: [
      "Almoços e jantares",
      "Entradas dos atrativos",
      "Gastos pessoais",
    ],
    entradas: [
      "Cachoeira da Fumacinha: ~R$ 30",
      "Cachoeira do Buracão: ~R$ 25",
    ],
    levar: [
      "Tênis de trilha ou bota leve",
      "Roupa de banho e toalha",
      "Protetor solar e repelente",
      "Mochila pequena (daypack)",
      "Garrafa d'água de 1,5L",
      "Lanche energético para o dia intenso",
      "Dinheiro em espécie para entradas",
    ],
  },
] as const;

// ─── FAQ data ──────────────────────────────────────────────────────────────────
const faqGeral = [
  { q: "Qual a melhor época para ir à Chapada Diamantina?", a: "A Chapada pode ser visitada o ano todo. A estação seca (maio a setembro) oferece mais dias de sol e trilhas mais firmes. A temporada de chuvas (novembro a março) deixa a vegetação mais verde e as cachoeiras mais cheias, mas algumas trilhas ficam escorregadias." },
  { q: "Preciso ter preparo físico para ir?", a: "Depende do roteiro. Lençóis tem caminhadas leves a moderadas, acessíveis para a maioria. Mucugê tem um dia intenso mas os outros são tranquilos. Vale do Pati exige bom preparo físico — caminhadas de 12 a 16km por dia em terreno irregular." },
  { q: "É seguro? Como são os guias?", a: "Sim. Todos os nossos guias são credenciados, nativos da região e com vasta experiência no destino. Levamos seguro aventura em todos os roteiros e trabalhamos com grupos de tamanho controlado para garantir segurança e qualidade." },
  { q: "O que levar para qualquer roteiro da Chapada?", a: "Itens essenciais: tênis fechado confortável, protetor solar, repelente, garrafa d'água, roupa de banho, toalha e dinheiro em espécie para entradas pagas." },
  { q: "Como funciona a reserva?", a: "Você escolhe a data, preenche o formulário de inscrição e garante sua vaga com entrada via PIX ou cartão. Após a confirmação, recebe todas as informações por WhatsApp: o que levar, ponto de encontro e cronograma detalhado." },
];

const faqPorRoteiro: Record<string, { q: string; a: string }[]> = {
  lencois: [
    { q: "É um bom roteiro para quem nunca foi à Chapada?", a: "Sim, é o roteiro ideal para estreantes. Combina atrativos variados (grutas, poços, cachoeiras, mirante) com logística confortável (pousada, café da manhã incluso) e trilhas acessíveis." },
    { q: "Qual é a dificuldade real das trilhas?", a: "A maioria das atividades é de fácil a moderado. O Ribeirão do Meio exige 7km de caminhada numa trilha arenosa. O Morro do Pai Inácio tem uma subida íngreme de ~20 minutos mas o restante é tranquilo." },
    { q: "As entradas dos atrativos são obrigatórias?", a: "Sim, as entradas (Poço Azul, Pratinha, Lapa Doce) são cobradas na portaria e não estão incluídas no pacote. Leve dinheiro em espécie — a maioria não aceita cartão." },
  ],
  valedopati: [
    { q: "Preciso de guia obrigatório no Vale do Pati?", a: "Sim. O Vale do Pati é dentro do Parque Nacional e guia credenciado é obrigatório por lei. Além disso, o terreno é complexo e a orientação é fundamental para a segurança." },
    { q: "Como é dormir em casa de nativo?", a: "É uma experiência autêntica e simples. Os anfitriões servem refeições caseiras e oferecem camas ou redes. Não há TV, ar-condicionado ou Wi-Fi — é uma imersão real na vida do vale." },
    { q: "Qual o preparo físico mínimo recomendado?", a: "Recomendamos conseguir caminhar 10km numa única saída sem grandes dificuldades. Qualquer tipo de caminhada regular, corrida ou ciclismo nos meses anteriores ajuda muito." },
    { q: "E se eu quiser levar mochila grande na travessia?", a: "É possível contratar transporte de mochila por animais (burro de carga) — é opcional e cobrado à parte (~R$ 80). Muitos optam por isso no dia mais pesado da travessia." },
  ],
  mucuge: [
    { q: "A Cachoeira da Fumacinha é acessível para todos?", a: "Não. A trilha tem 14km de ida e volta com subidas exigentes. É um dos passeios mais difíceis da Chapada. Se o grupo não tiver preparo, podemos substituir pelo Buracão (6km, mais acessível)." },
    { q: "Qual a melhor época para ver a Fumacinha mais cheia?", a: "De dezembro a março, quando as chuvas são mais frequentes. Na seca (junho a setembro) a queda é menor mas a trilha é mais segura." },
    { q: "Mucugê é longe de Lençóis?", a: "São cerca de 160km de distância (2h30 a 3h de carro). A base é completamente diferente: mais tranquila, histórica e menos turística que Lençóis." },
  ],
};

// ─── Component ────────────────────────────────────────────────────────────────
const ChapadaDiamantina = () => {
  const { tours, loading } = useTours();

  const chapadaTours = useMemo(
    () =>
      tours
        .filter(
          (t) =>
            t.is_active &&
            t.name.toLowerCase().includes("chapada") &&
            new Date(t.start_date + "T12:00:00") >= new Date()
        )
        .sort(
          (a, b) =>
            new Date(a.start_date + "T12:00:00").getTime() -
            new Date(b.start_date + "T12:00:00").getTime()
        ),
    [tours]
  );

  const tourIds = useMemo(() => chapadaTours.map((t) => t.id), [chapadaTours]);
  const { getCoverImage } = useTourCoverImages(tourIds);

  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [reservaModalOpen, setReservaModalOpen] = useState(false);
  const [tourParaReserva, setTourParaReserva] = useState<Tour | null>(null);
  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);
  const [waitlistTour, setWaitlistTour] = useState<Tour | null>(null);
  const [depoimentos, setDepoimentos] = useState<
    { id: string; nome: string; foto_url: string | null; texto: string; nota: number }[]
  >([]);
  const [faqRouteiro, setFaqRouteiro] = useState("lencois");

  useEffect(() => {
    (supabase as any)
      .from("depoimentos")
      .select("id, nome, foto_url, texto, nota")
      .eq("ativo", true)
      .order("display_order")
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }: any) => {
        if (data) setDepoimentos(data);
      });
  }, []);

  const handleMoreInfo = (tour: Tour) => {
    setSelectedTour(tour);
    setModalOpen(true);
  };
  const handleReservar = (tour: Tour) => {
    setTourParaReserva(tour);
    setReservaModalOpen(true);
  };
  const handleWaitlist = (tour: Tour) => {
    setWaitlistTour(tour);
    setWaitlistModalOpen(true);
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const formatDate = (dateStr: string, endDateStr?: string | null) => {
    const s = new Date(dateStr);
    const fs = format(s, "dd 'de' MMMM", { locale: ptBR });
    if (endDateStr) {
      const e = new Date(endDateStr);
      return `${fs} a ${format(e, "dd 'de' MMMM", { locale: ptBR })}`;
    }
    return fs;
  };

  return (
    <div className="min-h-screen bg-background">
      <TopMenu className="bg-background border-b" />

      {/* ── 1. HERO ── */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('/chapada-diamantina.jpg')`, filter: "brightness(0.55)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/70" />

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <Badge className="mb-6 bg-primary/90 text-white px-4 py-1.5 text-sm font-medium">
            Portal de Destino
          </Badge>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Chapada Diamantina<br />
            <span className="text-primary">com 3 formas de viver</span>
          </h1>

          <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto">
            Escolha entre os clássicos de Lençóis, a travessia do Vale do Pati ou a base em Mucugê — e encontre o roteiro ideal para o seu ritmo.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg"
              onClick={() => scrollTo("comparador")}
            >
              Escolher meu roteiro
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10 px-8 py-6 text-lg"
              onClick={() => window.open(waLink("Olá! Gostaria de saber mais sobre a Chapada Diamantina"), "_blank")}
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Falar com a equipe
            </Button>
          </div>
        </div>

        {/* scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="h-8 w-8 text-white/60" />
        </div>
      </section>

      {/* ── 2. COMPARADOR DE ROTEIROS ── */}
      <section id="comparador" className="py-20 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Três roteiros, três experiências
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A Chapada é grande demais para ser vendida como uma coisa só. Cada base entrega uma experiência completamente diferente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {roteiros.map((r) => (
              <Card
                key={r.id}
                className={`relative border-2 hover:shadow-lg transition-all duration-300 overflow-hidden ${r.destaque ? "border-primary" : "border-border"}`}
              >
                {r.destaque && (
                  <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-xs font-bold text-center py-1.5 tracking-wide">
                    {r.destaque}
                  </div>
                )}
                <CardContent className={`p-6 ${r.destaque ? "pt-10" : "pt-6"}`}>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${r.cor} flex items-center justify-center mb-4`}>
                    <Mountain className="h-6 w-6 text-white" />
                  </div>

                  <h3 className="text-xl font-bold text-foreground mb-1">{r.nome}</h3>
                  <p className="text-sm text-muted-foreground mb-4 italic">{r.tagline}</p>

                  <div className="space-y-2 mb-5 text-sm">
                    <div className="flex items-center gap-2">
                      <Flame className="h-4 w-4 text-muted-foreground shrink-0" />
                      <DiffBadge level={r.nivel} />
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span>{r.dias} dias</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4 shrink-0" />
                      <span>{r.perfil}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span>{r.hospedagem}</span>
                    </div>
                  </div>

                  <Button
                    variant={r.destaque ? "default" : "outline"}
                    className="w-full"
                    onClick={() => scrollTo(r.id)}
                  >
                    Ver roteiro completo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. SELETOR "QUAL CHAPADA COMBINA COM VOCÊ?" ── */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8">
            Qual Chapada combina com você?
          </h2>
          <div className="space-y-4">
            {[
              { texto: "Se você quer", destaque: "a primeira grande experiência na Chapada", roteiro: "Lençóis", id: "lencois" },
              { texto: "Se você quer", destaque: "desconexão total e travessia real", roteiro: "Vale do Pati", id: "valedopati" },
              { texto: "Se você quer", destaque: "cachoeiras intensas e base histórica", roteiro: "Mucugê", id: "mucuge" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="w-full text-left bg-background border border-border rounded-xl p-5 hover:border-primary hover:shadow-md transition-all duration-200 group"
              >
                <div className="flex items-center justify-between">
                  <p className="text-base text-muted-foreground">
                    {item.texto} <strong className="text-foreground">{item.destaque}</strong>:
                    {" "}<span className="text-primary font-semibold">{item.roteiro}</span>
                  </p>
                  <ArrowRight className="h-4 w-4 text-primary shrink-0 ml-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4-6. BLOCOS DETALHADOS POR ROTEIRO ── */}
      {roteiros.map((r, rIdx) => (
        <section
          key={r.id}
          id={r.id}
          className={`py-20 px-4 ${rIdx % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
        >
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-4 mb-10">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${r.cor} flex items-center justify-center shrink-0`}>
                <Mountain className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground">{r.nome}</h2>
                  <DiffBadge level={r.nivel} />
                </div>
                <p className="text-lg text-muted-foreground">{r.tagline}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Left column */}
              <div className="space-y-10">
                {/* Atrativos */}
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-5 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Principais atrativos
                  </h3>
                  <div className="space-y-3">
                    {r.atrativos.map((a) => (
                      <div key={a.nome} className="flex gap-3 p-3 rounded-lg border bg-background hover:shadow-sm transition-shadow">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-semibold text-foreground text-sm">{a.nome}</span>
                            <DiffBadge level={a.nivel} />
                            {a.km !== "—" && a.km !== "inclusa" && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Footprints className="h-3 w-3" />{a.km}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{a.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Atenção especial para Vale do Pati */}
                {"atencao" in r && r.atencao && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <h4 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Importante saber antes de ir
                    </h4>
                    <ul className="space-y-2">
                      {(r.atencao as string[]).map((item) => (
                        <li key={item} className="text-sm text-amber-700 flex items-start gap-2">
                          <span className="mt-1 shrink-0">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* O que levar */}
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Backpack className="h-5 w-5 text-primary" />
                    O que levar
                  </h3>
                  <ul className="space-y-2">
                    {r.levar.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-10">
                {/* Programação diária */}
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-5 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Programação típica
                  </h3>
                  <div className="space-y-4">
                    {r.programacao.map((dia, dIdx) => (
                      <div key={dIdx} className="flex gap-4">
                        <div className="flex flex-col items-center shrink-0">
                          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                            D{dia.dia}
                          </div>
                          {dIdx < r.programacao.length - 1 && (
                            <div className="w-0.5 flex-1 bg-border mt-1 mb-0" />
                          )}
                        </div>
                        <div className="pb-4 flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-foreground text-sm">{dia.label}</span>
                            <DiffBadge level={dia.nivel} />
                          </div>
                          <ul className="space-y-1">
                            {dia.itens.map((item) => (
                              <li key={item} className="text-sm text-muted-foreground flex items-start gap-1.5">
                                <span className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Incluso / Não incluso */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      O que está incluso
                    </h4>
                    <ul className="space-y-1.5">
                      {r.incluso.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
                      <X className="h-4 w-4 text-red-500" />
                      Não incluso
                    </h4>
                    <ul className="space-y-1.5">
                      {r.naoIncluso.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>

                    {r.entradas.length > 0 && (
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                          Entradas / taxas extras
                        </p>
                        {r.entradas.map((e) => (
                          <p key={e} className="text-xs text-muted-foreground">• {e}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* CTA */}
                <div className="pt-2">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto"
                    onClick={() => scrollTo("datas")}
                  >
                    Ver próximas saídas de {r.nome}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* ── 7. COMPARADOR FINAL LADO A LADO ── */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-foreground mb-3">Comparativo rápido</h2>
            <p className="text-muted-foreground">Ainda em dúvida? Veja lado a lado.</p>
          </div>
          <div className="overflow-x-auto rounded-xl border shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="p-4 text-left font-semibold w-1/4">Critério</th>
                  <th className="p-4 text-center font-semibold">Lençóis</th>
                  <th className="p-4 text-center font-semibold">Vale do Pati</th>
                  <th className="p-4 text-center font-semibold">Mucugê</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { label: "Duração", vals: ["4 dias", "3 dias", "3 dias"] },
                  { label: "Nível físico", vals: ["Moderado", "Intenso", "Mod-Intenso"] },
                  { label: "Hospedagem", vals: ["Pousada", "Casa nativo", "Pousada hist."] },
                  { label: "Perfil ideal", vals: ["Primeira vez", "Aventureiros", "Cachoeiras"] },
                  { label: "Melhor para", vals: ["Variedade", "Imersão", "Natureza bruta"] },
                  { label: "Conforto", vals: ["Alto", "Baixo", "Médio"] },
                ].map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                    <td className="p-4 font-medium text-foreground">{row.label}</td>
                    {row.vals.map((v, vi) => (
                      <td key={vi} className="p-4 text-center text-muted-foreground">{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── 8. PRÓXIMAS SAÍDAS ── */}
      <section id="datas" className="py-20 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Próximas Saídas
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Datas reais com vagas abertas para a Chapada Diamantina
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="mt-4 text-muted-foreground">Carregando datas...</p>
            </div>
          ) : chapadaTours.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {chapadaTours.slice(0, 9).map((tour) => {
                const coverImageData = getCoverImage(tour.id);
                const coverImage = coverImageData?.imageUrl || "/chapada-diamantina.jpg";
                const isEsgotado = tour.vagas_fechadas;

                return (
                  <Card
                    key={tour.id}
                    className="border shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group cursor-pointer"
                    onClick={() => handleMoreInfo(tour)}
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={coverImage}
                        alt={tour.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-3 left-3">
                        <Badge className="bg-white/90 text-foreground text-xs px-2 py-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(tour.start_date, tour.end_date)}
                        </Badge>
                      </div>
                      {isEsgotado && (
                        <div className="absolute top-3 right-3">
                          <Badge variant="destructive" className="text-xs">Esgotado</Badge>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-foreground mb-2 line-clamp-2">{tour.name}</h3>
                      {tour.valor_padrao && tour.valor_padrao > 0 && (
                        <p className="text-lg font-bold text-primary mb-3">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(tour.valor_padrao)}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={(e) => { e.stopPropagation(); handleMoreInfo(tour); }}
                        >
                          Saber mais
                        </Button>
                        <Button
                          size="sm"
                          variant={isEsgotado ? "outline" : "default"}
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            isEsgotado ? handleWaitlist(tour) : handleReservar(tour);
                          }}
                        >
                          {isEsgotado ? "Lista de Espera" : "Reservar"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-muted/30 rounded-2xl">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Novas datas em breve</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Entre em contato para ser o primeiro a saber quando abrirem as próximas vagas.
              </p>
              <Button
                onClick={() => window.open(waLink("Olá! Gostaria de ser avisado sobre as próximas datas para a Chapada Diamantina"), "_blank")}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Entrar em contato
              </Button>
            </div>
          )}

          {chapadaTours.length > 9 && (
            <div className="text-center mt-8">
              <Button variant="outline" size="lg" onClick={() => (window.location.href = "/")}>
                Ver todas as datas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ── 9. DEPOIMENTOS ── */}
      <section className="py-20 px-4 bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              O que dizem nossos viajantes
            </h2>
          </div>

          {depoimentos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {depoimentos.map((d) => (
                <Card key={d.id} className="border shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex gap-1 mb-4">
                      {[...Array(d.nota || 5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-4 italic text-sm">"{d.texto}"</p>
                    <div className="flex items-center gap-3">
                      {d.foto_url ? (
                        <img src={d.foto_url} alt={d.nome} className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {d.nome.charAt(0)}
                        </div>
                      )}
                      <p className="font-semibold text-foreground text-sm">{d.nome}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            /* Elfsight placeholder — substituir pelo embed real quando disponível */
            <div className="text-center py-10 text-muted-foreground text-sm">
              Depoimentos serão exibidos aqui.
            </div>
          )}

          <div className="flex justify-center gap-8 mt-12 text-center">
            {[["100+", "Grupos realizados"], ["2000+", "Viajantes"], ["10+", "Anos de experiência"]].map(([n, l]) => (
              <div key={l}>
                <p className="text-3xl font-bold text-primary">{n}</p>
                <p className="text-sm text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. FAQ ── */}
      <section className="py-20 px-4 bg-background">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Perguntas frequentes</h2>
          </div>

          {/* FAQ Geral */}
          <h3 className="text-lg font-semibold text-foreground mb-4">Geral — Chapada Diamantina</h3>
          <Accordion type="single" collapsible className="mb-10">
            {faqGeral.map((item, idx) => (
              <AccordionItem key={idx} value={`geral-${idx}`}>
                <AccordionTrigger className="text-left text-sm font-medium hover:no-underline py-4">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* FAQ por Roteiro */}
          <h3 className="text-lg font-semibold text-foreground mb-4">Por roteiro</h3>
          <div className="flex gap-2 mb-6 flex-wrap">
            {roteiros.map((r) => (
              <Button
                key={r.id}
                variant={faqRouteiro === r.id ? "default" : "outline"}
                size="sm"
                onClick={() => setFaqRouteiro(r.id)}
              >
                {r.nome}
              </Button>
            ))}
          </div>
          <Accordion type="single" collapsible>
            {(faqPorRoteiro[faqRouteiro] || []).map((item, idx) => (
              <AccordionItem key={idx} value={`rot-${idx}`}>
                <AccordionTrigger className="text-left text-sm font-medium hover:no-underline py-4">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── 11. CTA FINAL CONSULTIVO ── */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ainda com dúvida sobre qual roteiro escolher?
          </h2>
          <p className="text-lg opacity-90 mb-8">
            Nossa equipe responde rapidamente e ajuda você a encontrar o roteiro ideal para seu perfil, condicionamento e expectativas.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="px-10 py-6 text-lg"
            onClick={() => window.open(waLink("Olá! Quero ajuda para escolher o melhor roteiro da Chapada Diamantina para mim."), "_blank")}
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            Falar com a equipe no WhatsApp
          </Button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-foreground text-background py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-4">
              <img src={logoImage} alt="Camaleão Ecoturismo" className="h-12 w-auto brightness-0 invert" />
              <div>
                <p className="font-semibold">Camaleão Ecoturismo</p>
                <p className="text-sm opacity-70">Aventuras que transformam</p>
              </div>
            </div>
            <div className="flex gap-6 text-sm opacity-70">
              <a href="/" className="hover:opacity-100 transition-opacity">Início</a>
              <a href="#datas" onClick={(e) => { e.preventDefault(); scrollTo("datas"); }} className="hover:opacity-100 transition-opacity">Datas</a>
              <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noopener noreferrer" className="hover:opacity-100 transition-opacity">Contato</a>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-8 text-center text-sm opacity-50">
            © {new Date().getFullYear()} Camaleão Ecoturismo. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      {/* Modals */}
      {selectedTour && (
        <TourModal
          tour={selectedTour}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onReservar={handleReservar}
          onWaitlist={handleWaitlist}
        />
      )}
      {tourParaReserva && (
        <ReservaModal
          tour={tourParaReserva}
          open={reservaModalOpen}
          onClose={() => setReservaModalOpen(false)}
        />
      )}
      {waitlistTour && (
        <WaitlistModal
          tour={waitlistTour}
          open={waitlistModalOpen}
          onClose={() => setWaitlistModalOpen(false)}
        />
      )}

      <FloatingContactButton />
    </div>
  );
};

export default ChapadaDiamantina;
