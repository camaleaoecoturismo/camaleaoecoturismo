import { useSearchParams } from "react-router-dom";
import bannerSobre from "@/assets/banner-sobre.png";
import { TopMenu } from "@/components/TopMenu";
import Footer from "@/components/Footer";
import {
  Users, Mountain, Award, Calendar,
  BookOpen, TreePine, Shield, Heart,
  Star, MapPin, Clock, Smile,
  MessageCircle, ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "empresas" | "escolas" | "grupos";

// ─── WhatsApp ─────────────────────────────────────────────────────────────────
const WA_NUMBER = "5582993649454";
function waLink(msg: string) {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string }[] = [
  { id: "empresas", label: "Empresas" },
  { id: "escolas",  label: "Escolas" },
  { id: "grupos",   label: "Grupos Privativos" },
];

const CONTENT = {
  empresas: {
    color: "#820AD1",
    colorLight: "#f5e8ff",
    intro: {
      eyebrow: "Team building & retiros corporativos",
      title: "Transforme sua equipe através da natureza",
      text: "Criamos experiências exclusivas de team building, retiros corporativos e vivências ao ar livre que fortalecem vínculos, desenvolvem liderança e renovam energias — tudo com a segurança e a expertise da Camaleão.",
    },
    benefits: [
      { icon: Users,    title: "Team Building",        text: "Dinâmicas na natureza que fortalecem coesão, comunicação e confiança entre os membros do time." },
      { icon: Mountain, title: "Retiros Corporativos", text: "Ambientes naturais que estimulam criatividade, foco estratégico e descanso mental produtivo." },
      { icon: Award,    title: "Reconhecimento",       text: "Celebre conquistas e metas atingidas com experiências inesquecíveis para toda a equipe." },
      { icon: Calendar, title: "Datas Flexíveis",      text: "Planejamos junto com você na data e formato que melhor encaixam na agenda corporativa." },
    ],
    steps: [
      { n: "01", title: "Fale com a gente",     text: "Conta para nós o objetivo, o tamanho do grupo e a data ideal." },
      { n: "02", title: "Receba uma proposta",   text: "Montamos um roteiro sob medida, com atividades alinhadas aos valores da empresa." },
      { n: "03", title: "Viva a experiência",   text: "Sua equipe sai conectada, renovada e motivada para novos desafios." },
    ],
    ctaText: "Solicitar proposta para minha empresa",
    waMsg: "Olá! Tenho interesse em experiências corporativas para minha equipe. Pode me enviar mais informações?",
  },
  escolas: {
    color: "#1a5c38",
    colorLight: "#e8f5ee",
    intro: {
      eyebrow: "Excursões pedagógicas & educação ambiental",
      title: "Educação que vai além da sala de aula",
      text: "Desenvolvemos vivências pedagógicas na natureza que despertam curiosidade, estimulam o trabalho em equipe e criam memórias afetivas duradouras — sempre com conteúdo alinhado à realidade dos estudantes.",
    },
    benefits: [
      { icon: BookOpen, title: "Educação Ambiental", text: "Conteúdos práticos em ambientes naturais preservados, conectando teoria e vivência real." },
      { icon: TreePine, title: "Vivência na Natureza", text: "Os alunos aprendem sobre ecossistemas, fauna e flora de forma lúdica e envolvente." },
      { icon: Shield,   title: "Segurança Total",    text: "Guias especializados, equipamentos adequados e protocolos específicos para grupos escolares." },
      { icon: Heart,    title: "Bem-estar",          text: "Atividades que desenvolvem saúde física, mental e social dos estudantes." },
    ],
    steps: [
      { n: "01", title: "Entre em contato",         text: "Fale com nossa equipe e informe a série, o número de alunos e a data preferida." },
      { n: "02", title: "Proposta pedagógica",       text: "Elaboramos roteiro alinhado ao conteúdo curricular e à faixa etária da turma." },
      { n: "03", title: "Aventura com aprendizado", text: "Os alunos vivem experiências que ficam na memória — e no coração — para sempre." },
    ],
    ctaText: "Solicitar proposta para minha escola",
    waMsg: "Olá! Tenho interesse em excursões pedagógicas para minha escola. Pode me enviar mais informações?",
  },
  grupos: {
    color: "#c45c1a",
    colorLight: "#fff3eb",
    intro: {
      eyebrow: "Passeios exclusivos & celebrações",
      title: "Seu grupo, seu roteiro, sua data",
      text: "Planejamos experiências exclusivas para grupos de amigos, famílias, aniversários e confraternizações. Você escolhe o destino e o estilo — nós cuidamos de tudo para que seja inesquecível.",
    },
    benefits: [
      { icon: Star,   title: "Exclusividade",         text: "O passeio é só seu — sem mistura com outros grupos, no seu ritmo e estilo." },
      { icon: MapPin, title: "Roteiro Personalizado", text: "Escolha o destino, a duração e as atividades que mais combinam com o grupo." },
      { icon: Clock,  title: "Data à sua escolha",    text: "Não dependa de datas fixas — programe quando quiser, com antecedência." },
      { icon: Smile,  title: "Celebrações",           text: "Aniversários, formaturas, despedidas de solteiro — tornamos cada momento especial." },
    ],
    steps: [
      { n: "01", title: "Nos chame no WhatsApp",     text: "Diga quantas pessoas, a ocasião especial e o que o grupo curte fazer." },
      { n: "02", title: "Seu roteiro sob medida",    text: "Apresentamos opções de destinos, atividades e o melhor custo-benefício." },
      { n: "03", title: "Aventura exclusiva",        text: "Sua turma, do seu jeito — e uma história que vão contar pra sempre." },
    ],
    ctaText: "Solicitar roteiro privativo",
    waMsg: "Olá! Tenho interesse em um passeio privativo para meu grupo. Pode me enviar mais informações?",
  },
} satisfies Record<Tab, {
  color: string; colorLight: string;
  intro: { eyebrow: string; title: string; text: string };
  benefits: { icon: React.ElementType; title: string; text: string }[];
  steps: { n: string; title: string; text: string }[];
  ctaText: string; waMsg: string;
}>;

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Organizacoes() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tipo");
  const tab: Tab = (raw === "escolas" || raw === "grupos") ? raw : "empresas";
  const setTab = (t: Tab) => setParams({ tipo: t }, { replace: true });

  const data = CONTENT[tab];

  return (
    <div className="min-h-screen bg-background">
      <TopMenu />

      {/* ── Hero ── */}
      <div className="relative w-full h-64 md:h-80 overflow-hidden">
        <img src={bannerSobre} alt="Para Organizações" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 px-6 pb-8 md:px-12 md:pb-10 flex flex-col gap-2">
          <span className="inline-flex w-fit items-center gap-1.5 bg-[#820AD1] text-white text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full">
            Experiências para grupos
          </span>
          <h1 className="font-bold text-4xl md:text-6xl text-white leading-none tracking-tight">
            PARA ORGANIZAÇÕES
          </h1>
          <p className="text-white/80 text-sm md:text-base max-w-xl">
            Empresas, escolas e grupos que querem reconectar pessoas à natureza.
          </p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto px-4 flex overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 px-5 py-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? "border-[#820AD1] text-[#820AD1]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Intro strip ── */}
      <section style={{ backgroundColor: data.color }} className="py-12 px-4 transition-colors duration-300">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-8">
          <div className="flex-1">
            <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-2">
              {data.intro.eyebrow}
            </p>
            <h2 className="font-bold text-2xl md:text-3xl text-white leading-snug mb-3">
              {data.intro.title}
            </h2>
            <p className="text-white/85 text-sm md:text-base leading-relaxed max-w-2xl">
              {data.intro.text}
            </p>
          </div>
          <a
            href={waLink(data.waMsg)}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-2 bg-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-white/90 transition-colors shadow-lg"
            style={{ color: data.color }}
          >
            <MessageCircle className="h-5 w-5" />
            Fale com a gente
          </a>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h3 className="font-bold text-xl md:text-2xl text-foreground text-center mb-10">
            Por que escolher a Camaleão para o seu grupo?
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {data.benefits.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="flex flex-col items-center text-center p-5 rounded-2xl border border-border hover:shadow-md transition-shadow"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shrink-0"
                  style={{ backgroundColor: data.colorLight }}
                >
                  <Icon className="h-7 w-7" style={{ color: data.color }} />
                </div>
                <p className="font-bold text-foreground text-sm mb-1">{title}</p>
                <p className="text-muted-foreground text-xs leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Como funciona ── */}
      <section className="py-14 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h3 className="font-bold text-xl md:text-2xl text-foreground text-center mb-10">
            Como funciona
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.steps.map(({ n, title, text }) => (
              <div key={n} className="relative flex flex-col items-start bg-white rounded-2xl p-6 border border-border shadow-sm">
                <span
                  className="font-bold text-4xl leading-none mb-4 opacity-15"
                  style={{ color: data.color }}
                >
                  {n}
                </span>
                <p className="font-bold text-foreground text-base mb-2">{title}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">{text}</p>
                {/* connector arrow (desktop only) */}
                {n !== data.steps[data.steps.length - 1].n && (
                  <ChevronRight
                    className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 h-7 w-7 z-10"
                    style={{ color: data.color }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ backgroundColor: data.color }} className="py-14 px-4 transition-colors duration-300">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="font-bold text-2xl md:text-3xl text-white mb-3">
            Pronto para começar?
          </h3>
          <p className="text-white/80 text-sm md:text-base mb-8 max-w-lg mx-auto">
            Fale com nossa equipe agora mesmo. Respondemos rapidinho no WhatsApp!
          </p>
          <a
            href={waLink(data.waMsg)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-white font-bold text-base px-8 py-4 rounded-2xl hover:bg-white/90 transition-colors shadow-xl"
            style={{ color: data.color }}
          >
            <MessageCircle className="h-5 w-5" />
            {data.ctaText}
          </a>
        </div>
      </section>

      {/* ── Números de impacto ── */}
      <section className="py-12 px-4 border-y border-border bg-background">
        <div className="max-w-3xl mx-auto grid grid-cols-3 divide-x divide-border">
          {[
            { value: "+5.000", label: "pessoas atendidas" },
            { value: "+50",    label: "empresas e escolas parceiras" },
            { value: "6 anos", label: "de experiência" },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center text-center px-4 py-4">
              <span className="font-bold text-2xl md:text-4xl text-[#820AD1] leading-none">{value}</span>
              <span className="text-muted-foreground text-[10px] md:text-xs uppercase tracking-widest mt-1">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
