import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import bannerSobre from "@/assets/banner-sobre.png";
import rioGelado from "@/assets/rio-gelado.jpg";
import { TopMenu } from "@/components/TopMenu";
import Footer from "@/components/Footer";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "empresas" | "escolas" | "grupos";

interface Partner {
  id: string;
  name: string;
  logo_url: string;
  website_url: string | null;
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────────
const WA_NUMBER = "5582993649454";
function waLink(msg: string) {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
}

// ─── Tab nav ──────────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string }[] = [
  { id: "empresas", label: "Empresas" },
  { id: "escolas",  label: "Escolas" },
  { id: "grupos",   label: "Grupos Privativos" },
];

// ─── Content ──────────────────────────────────────────────────────────────────
const CONTENT: Record<Tab, {
  color: string;
  heroTitle: string;
  heroSub: string;
  impactText: string;
  cards: { img: string; label: string; bullets: string[] }[];
  midText: string;
  ctaText: string;
  waMsg: string;
  steps: { n: string; title: string; text: string }[];
}> = {
  empresas: {
    color: "#820AD1",
    heroTitle: "CAMALEÃO PRA EMPRESAS",
    heroSub: "Experiências com propósito para engajar pessoas, fortalecer culturas e gerar conexões reais.",
    impactText: "Vivências na natureza para empresas que querem ir além do escritório — e transformar equipes de verdade.",
    cards: [
      {
        img: rioGelado,
        label: "TEAM BUILDING",
        bullets: [
          "Dinâmicas de integração na natureza",
          "Trilhas e atividades em grupo",
          "Experiências de liderança ao ar livre",
        ],
      },
      {
        img: bannerSobre,
        label: "RETIRO CORPORATIVO",
        bullets: [
          "Retiros de 1 ou 2 dias em destinos naturais",
          "Programação personalizada para o time",
          "Espaço para reflexão estratégica e descanso",
        ],
      },
    ],
    midText: "Da concepção à execução, ajudamos sua empresa a transformar intenção em experiências que ficam na memória.",
    ctaText: "SOLICITAR PROPOSTA",
    waMsg: "Olá! Tenho interesse em experiências corporativas para minha equipe. Pode me enviar mais informações?",
    steps: [
      { n: "01", title: "Fale com a gente",   text: "Conta o objetivo, o tamanho do grupo e a data ideal." },
      { n: "02", title: "Proposta sob medida", text: "Montamos um roteiro alinhado à cultura e aos valores da empresa." },
      { n: "03", title: "Viva a experiência", text: "Sua equipe conectada, renovada e motivada." },
    ],
  },
  escolas: {
    color: "#1a5c38",
    heroTitle: "CAMALEÃO PRA ESCOLAS",
    heroSub: "Educação que vai além da sala de aula — vivências na natureza que marcam para sempre.",
    impactText: "Excursões pedagógicas e educação ambiental para escolas que querem ensinar com o coração.",
    cards: [
      {
        img: rioGelado,
        label: "EXCURSÃO PEDAGÓGICA",
        bullets: [
          "Roteiros alinhados ao conteúdo curricular",
          "Guias especializados para grupos escolares",
          "Aprendizado prático em ambientes naturais",
        ],
      },
      {
        img: bannerSobre,
        label: "EDUCAÇÃO AMBIENTAL",
        bullets: [
          "Vivências sobre ecossistemas locais",
          "Atividades lúdicas sobre fauna e flora",
          "Sensibilização ambiental e sustentabilidade",
        ],
      },
    ],
    midText: "Planejamos cada saída com cuidado para que cada aluno volte diferente — mais curioso, mais conectado, mais humano.",
    ctaText: "SOLICITAR PROPOSTA",
    waMsg: "Olá! Tenho interesse em excursões pedagógicas para minha escola. Pode me enviar mais informações?",
    steps: [
      { n: "01", title: "Entre em contato",         text: "Informe a série, o número de alunos e a data preferida." },
      { n: "02", title: "Proposta pedagógica",       text: "Roteiro alinhado ao conteúdo curricular e à faixa etária." },
      { n: "03", title: "Aventura com aprendizado", text: "Os alunos vivem experiências que ficam para sempre." },
    ],
  },
  grupos: {
    color: "#c45c1a",
    heroTitle: "GRUPOS PRIVATIVOS",
    heroSub: "Seu grupo, seu roteiro, sua data. Nós cuidamos de tudo.",
    impactText: "Experiências exclusivas para grupos de amigos, famílias e celebrações que merecem o melhor.",
    cards: [
      {
        img: rioGelado,
        label: "PASSEIO EXCLUSIVO",
        bullets: [
          "Passeio só para o seu grupo, sem mistura",
          "Roteiro personalizado ao gosto do grupo",
          "Datas flexíveis — quando você quiser",
        ],
      },
      {
        img: bannerSobre,
        label: "CELEBRAÇÕES",
        bullets: [
          "Aniversários e formaturas na natureza",
          "Despedidas de solteiro inesquecíveis",
          "Confraternizações e encontros de família",
        ],
      },
    ],
    midText: "Sua turma, do seu jeito — e uma história que vão contar para sempre.",
    ctaText: "SOLICITAR ROTEIRO",
    waMsg: "Olá! Tenho interesse em um passeio privativo para meu grupo. Pode me enviar mais informações?",
    steps: [
      { n: "01", title: "Nos chame no WhatsApp",  text: "Diga quantas pessoas, a ocasião e o que o grupo curte." },
      { n: "02", title: "Roteiro sob medida",     text: "Opções de destinos, atividades e o melhor custo-benefício." },
      { n: "03", title: "Aventura exclusiva",     text: "Sua turma, do seu jeito, inesquecível." },
    ],
  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Organizacoes() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tipo");
  const tab: Tab = (raw === "escolas" || raw === "grupos") ? raw : "empresas";
  const setTab = (t: Tab) => setParams({ tipo: t }, { replace: true });

  const [partners, setPartners] = useState<Partner[]>([]);

  useEffect(() => {
    supabase
      .from("partner_organizations" as any)
      .select("id, name, logo_url, website_url")
      .eq("active", true)
      .order("display_order")
      .then(({ data }) => { if (data) setPartners(data as Partner[]); });
  }, []);

  const d = CONTENT[tab];

  return (
    <div className="min-h-screen bg-background">
      <TopMenu />

      {/* ── Hero por tab ────────────────────────────────────────────────────── */}
      <div className="relative w-full h-72 md:h-[420px] overflow-hidden">
        <img
          src={bannerSobre}
          alt={d.heroTitle}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 gap-4">
          <h1 className="font-black text-4xl md:text-6xl text-white leading-none tracking-tight drop-shadow-lg">
            {d.heroTitle}
          </h1>
          <p className="text-white/85 text-base md:text-xl max-w-2xl leading-relaxed">
            {d.heroSub}
          </p>
          <a
            href={waLink(d.waMsg)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 text-white font-bold text-sm uppercase tracking-widest px-7 py-3 rounded-full border-2 border-white hover:bg-white/15 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            Fale com a gente
          </a>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto px-4 flex overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? "text-[#820AD1] border-[#820AD1]"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Frase de impacto ────────────────────────────────────────────────── */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <p
            className="font-bold text-xl md:text-2xl leading-snug"
            style={{ color: d.color }}
          >
            {d.impactText}
          </p>
        </div>
      </section>

      {/* ── Dois cards com foto + bullets ───────────────────────────────────── */}
      <section className="pb-14 px-4 bg-white">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {d.cards.map((card) => (
            <div key={card.label} className="flex flex-col rounded-2xl overflow-hidden border border-border shadow-sm">
              {/* Photo with label overlay */}
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={card.img}
                  alt={card.label}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 px-5 py-4">
                  <span className="font-black text-white text-xl md:text-2xl tracking-wide drop-shadow">
                    {card.label}
                  </span>
                </div>
              </div>
              {/* Bullets */}
              <div className="flex-1 bg-muted/30 px-6 py-5 flex flex-col gap-3">
                {card.bullets.map((b) => (
                  <div key={b} className="flex items-start gap-3">
                    <span
                      className="mt-1 w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: d.color }}
                    />
                    <p className="text-sm text-foreground leading-relaxed">{b}</p>
                  </div>
                ))}
              </div>
              {/* Colored bar */}
              <div className="h-1.5" style={{ backgroundColor: d.color }} />
            </div>
          ))}
        </div>
      </section>

      {/* ── Mid text + CTAs ─────────────────────────────────────────────────── */}
      <section className="py-12 px-4 bg-white border-t border-border">
        <div className="max-w-3xl mx-auto text-center flex flex-col items-center gap-8">
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            {d.midText}
          </p>
          <a
            href={waLink(d.waMsg)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-white font-bold text-sm uppercase tracking-widest px-8 py-4 rounded-xl hover:opacity-90 transition-opacity shadow-lg"
            style={{ backgroundColor: d.color }}
          >
            <MessageCircle className="h-5 w-5" />
            {d.ctaText}
          </a>
        </div>
      </section>

      {/* ── Como funciona ───────────────────────────────────────────────────── */}
      <section className="py-14 px-4 bg-muted/30 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-bold text-xl md:text-2xl text-foreground text-center mb-10">
            Como funciona
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {d.steps.map(({ n, title, text }, i) => (
              <div key={n} className="relative bg-white rounded-2xl p-6 border border-border shadow-sm">
                <span
                  className="font-black text-5xl leading-none opacity-10 mb-4 block"
                  style={{ color: d.color }}
                >
                  {n}
                </span>
                <p className="font-bold text-foreground text-base mb-2">{title}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">{text}</p>
                {/* connector dot (desktop) */}
                {i < d.steps.length - 1 && (
                  <div
                    className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-4 border-white z-10"
                    style={{ backgroundColor: d.color }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Parceiros (Supabase) ─────────────────────────────────────────────── */}
      {partners.length > 0 && (
        <section className="py-14 px-4 bg-white border-t border-border">
          <div className="max-w-5xl mx-auto">
            <p className="font-bold text-xs uppercase tracking-widest text-foreground mb-8">
              Organizações que já viveram a experiência Camaleão
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-3 gap-y-4 sm:gap-x-4 sm:gap-y-5 items-center">
              {partners.map((p) => (
                <a
                  key={p.id}
                  href={p.website_url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[82px] items-center justify-center hover:opacity-60 transition-opacity"
                  title={p.name}
                >
                  <img
                    src={p.logo_url}
                    alt={p.name}
                    className="h-16 md:h-20 w-auto max-w-full object-contain grayscale hover:grayscale-0 transition-all duration-300"
                  />
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Números ─────────────────────────────────────────────────────────── */}
      <section className="py-12 px-4 border-t border-border bg-background">
        <div className="max-w-3xl mx-auto grid grid-cols-3 divide-x divide-border">
          {[
            { value: "+5.000", label: "pessoas atendidas" },
            { value: "+50",    label: "grupos e organizações" },
            { value: "6 anos", label: "de experiência" },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center text-center px-4 py-4">
              <span className="font-bold text-2xl md:text-4xl leading-none" style={{ color: d.color }}>{value}</span>
              <span className="text-muted-foreground text-[10px] md:text-xs uppercase tracking-widest mt-1">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA final ───────────────────────────────────────────────────────── */}
      <section className="py-16 px-4" style={{ backgroundColor: d.color }}>
        <div className="max-w-2xl mx-auto text-center flex flex-col items-center gap-6">
          <h2 className="font-bold text-2xl md:text-3xl text-white leading-snug">
            Pronto para começar?
          </h2>
          <p className="text-white/80 text-sm md:text-base max-w-md">
            Fale com nossa equipe agora mesmo — respondemos rapidinho no WhatsApp!
          </p>
          <a
            href={waLink(d.waMsg)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-white font-bold text-base px-8 py-4 rounded-2xl hover:bg-white/90 transition-colors shadow-xl"
            style={{ color: d.color }}
          >
            <MessageCircle className="h-5 w-5" />
            {d.ctaText}
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
