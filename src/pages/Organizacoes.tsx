import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { TopMenu } from "@/components/TopMenu";
import Footer from "@/components/Footer";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Bus,
  CalendarRange,
  Check,
  GraduationCap,
  HeartHandshake,
  MapPinned,
  MessageCircle,
  Play,
  ShieldCheck,
  Sparkles,
  Star,
  TreePine,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Tab = "empresas" | "escolas" | "grupos";

interface Partner {
  id: string;
  name: string;
  logo_url: string;
  website_url: string | null;
}

function companyMedia(path: string) {
  return new URL(`../../algumas fotos/Empresas/${path}`, import.meta.url).href;
}

const WA_NUMBER = "5582993649454";
function waLink(msg: string) {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
}

const TABS: { id: Tab; label: string; description: string; icon: typeof Building2 }[] = [
  {
    id: "empresas",
    label: "Empresas",
    description: "Integração, cultura, reconhecimento e retiros corporativos.",
    icon: Building2,
  },
  {
    id: "escolas",
    label: "Escolas",
    description: "Saídas pedagógicas com intenção, segurança e aprendizagem prática.",
    icon: GraduationCap,
  },
  {
    id: "grupos",
    label: "Grupos Privativos",
    description: "Passeios exclusivos para famílias, amigos e celebrações especiais.",
    icon: Users,
  },
];

const GLOBAL_DIFFERENTIALS = [
  {
    icon: HeartHandshake,
    title: "Atendimento consultivo",
    text: "Entendemos o objetivo do grupo antes de sugerir roteiro, formato e dinâmica.",
  },
  {
    icon: MapPinned,
    title: "Curadoria local de experiências",
    text: "Criamos vivências conectadas ao território, à natureza e ao perfil do público.",
  },
  {
    icon: ShieldCheck,
    title: "Operação com cuidado",
    text: "Planejamento, condução e logística pensados para que a experiência aconteça com tranquilidade.",
  },
  {
    icon: Sparkles,
    title: "Personalização real",
    text: "Cada proposta nasce do contexto do grupo, e não de um roteiro copiado e colado.",
  },
];

const SHARED_CASES = [
  {
    company: "Quartier Interiores",
    audience: "Integração, convivência e experiência memorável",
    title: "Confraternização na natureza com trilha, piscina, churrasco e música",
    summary:
      "Um encontro pensado para reunir o grupo fora da rotina e criar um clima de união, leveza e presença em um cenário natural bonito.",
    result:
      "Um dia de confraternização com mais identidade, leveza e memória afetiva — fora da rotina, dentro da natureza.",
    image: companyMedia("Quartier Interiores/camaleaoecoturismo_1764452943_3776827493157345936_42300883601_1.jpg"),
    video: companyMedia("Quartier Interiores/camaleaoecoturismo_1764452943_3776824074531160957_42300883601_10.mp4"),
    highlight: "Mostra como um dia de confraternização pode ter mais identidade e memória afetiva.",
  },
  {
    company: "Saneares",
    audience: "Bem-estar, pausa da rotina e natureza como experiência coletiva",
    title: "Imersão no Rio Gelado com barco, flutuação e banho de lagoa",
    summary:
      "Uma experiência de desaceleração e presença, com água, natureza e tempo de qualidade compartilhado em grupo.",
    result:
      "Uma experiência de desaceleração e presença que mostra como o bem-estar e a conexão humana podem ser o foco de um dia em grupo.",
    image: companyMedia("Saneares/camaleaoecoturismo_1752955384_3680378971366991789_42300883601_1.jpg"),
    video: companyMedia("Saneares/camaleaoecoturismo_1752955384_3680378388887264868_42300883601_5.mp4"),
    highlight: "Excelente vitrine para comunicar leveza, cuidado e experiência fora do óbvio.",
  },
  {
    company: "EngenhARQ",
    audience: "Aventura leve, integração e lembrança boa em grupo",
    title: "Dia de experiência em Jequiá com barco, trilha ecológica e flutuação",
    summary:
      "Uma combinação equilibrada entre movimento, natureza e tranquilidade, perfeita para grupos que querem viver algo especial juntos.",
    result:
      "Uma combinação de aventura leve, natureza e convivência que mostra como a experiência pode ser bonita, energizante e acessível a grupos variados.",
    image: companyMedia("EngenhARQ/camaleaoecoturismo_1748734060_3644967940801338755_42300883601_1.jpg"),
    video: companyMedia("EngenhARQ/camaleaoecoturismo_1748734060_3644966648209032440_42300883601_3.mp4"),
    highlight: "Ajuda a mostrar que a experiência pode ser ao mesmo tempo bonita, leve e energizante.",
  },
];

const CONTENT: Record<
  Tab,
  {
    color: string;
    tint: string;
    heroEyebrow: string;
    heroTitle: string;
    heroSub: string;
    heroHighlights: string[];
    badge: string;
    audienceTitle: string;
    audienceText: string;
    idealFor: string[];
    deliverTitle: string;
    deliverText: string;
    formats: { title: string; desc: string; points: string[] }[];
    whyTitle: string;
    whyText: string;
    guarantees: string[];
    sampleTitle: string;
    sampleText: string;
    examples: { title: string; desc: string; meta: string }[];
    steps: { n: string; title: string; text: string }[];
    finalTitle: string;
    finalText: string;
    ctaText: string;
    waMsg: string;
    sideImage: string;
    supportImage: string;
    sampleImages: string[];
  }
> = {
  empresas: {
    color: "#820AD1",
    tint: "from-[#1e1327]/80 via-[#4c2368]/55 to-[#820AD1]/30",
    heroEyebrow: "Experiências corporativas sob medida",
    heroTitle: "A natureza como palco para equipes mais conectadas, engajadas e memoráveis.",
    heroSub:
      "Criamos experiências para empresas que querem fortalecer cultura, reconhecer pessoas, integrar times e transformar encontros em algo que realmente faz sentido.",
    heroHighlights: [
      "Roteiros personalizados conforme objetivo da empresa",
      "Ideal para RH, liderança, convenções e confraternizações",
      "Operação completa com atendimento consultivo",
    ],
    badge: "Para empresas que querem ir além do evento genérico",
    audienceTitle: "Quando essa solução faz sentido",
    audienceText:
      "Perfeita para empresas que querem sair do formato tradicional e criar uma experiência que una estratégia, conexão humana e atmosfera inspiradora.",
    idealFor: [
      "Times em processo de integração ou fortalecimento de cultura",
      "Confraternizações e celebrações de resultados",
      "Retiros de liderança, planejamento e alinhamento",
      "Ações de reconhecimento, incentivo e experiência de marca empregadora",
    ],
    deliverTitle: "Formatos que podemos construir com a sua empresa",
    deliverText:
      "Em vez de uma solução única, desenhamos o formato certo para o momento do seu time, considerando duração, energia desejada e objetivo principal.",
    formats: [
      {
        title: "Team building na natureza",
        desc: "Experiências pensadas para fortalecer vínculos, colaboração e pertencimento.",
        points: [
          "Integração leve e memorável",
          "Atividades em grupo com propósito",
          "Clima mais humano e menos protocolar",
        ],
      },
      {
        title: "Retiro corporativo",
        desc: "Imersões para liderança, planejamento, pausa estratégica ou renovação do time.",
        points: [
          "Roteiro de 1 ou 2 dias",
          "Espaço para reflexão e convivência",
          "Experiência fora do ambiente comum",
        ],
      },
      {
        title: "Confraternização com significado",
        desc: "Celebrar resultados ou datas importantes sem cair no modelo previsível.",
        points: [
          "Experiência mais autoral",
          "Natureza, conexão e leveza",
          "Memória positiva da marca empregadora",
        ],
      },
    ],
    whyTitle: "O que diferencia a experiência Camaleão",
    whyText:
      "A Camaleão não entrega só um passeio para empresas. Entrega uma experiência desenhada com intencionalidade, contexto e operação para que sua equipe viva algo coerente com o momento da organização.",
    guarantees: [
      "Briefing inicial para entender objetivo, perfil do grupo e estilo do encontro",
      "Sugestões alinhadas ao momento da empresa e ao porte do time",
      "Condução com atmosfera leve, organizada e acolhedora",
      "Experiência que gera conexão real, não só agenda preenchida",
    ],
    sampleTitle: "Exemplos do que pode nascer daqui",
    sampleText:
      "Cada proposta nasce do contexto da empresa — aqui estão algumas possibilidades para inspirar o que construiremos juntos.",
    examples: [
      {
        title: "Imersão de equipe com trilha e convivência",
        desc: "Um dia para reconectar pessoas, criar repertório comum e respirar fora da rotina.",
        meta: "Ideal para times enxutos e squads",
      },
      {
        title: "Retiro de liderança com ritmo mais estratégico",
        desc: "Combinação de natureza, pausa qualificada e espaço para alinhamentos importantes.",
        meta: "Ideal para diretoria, coordenação e liderança",
      },
      {
        title: "Confraternização que foge do óbvio",
        desc: "Celebração com atmosfera mais autêntica, humana e conectada ao propósito da marca.",
        meta: "Ideal para fechamento de ciclo ou datas especiais",
      },
    ],
    steps: [
      {
        n: "01",
        title: "Entendemos o contexto",
        text: "Você compartilha o objetivo, o perfil do grupo, a data e o clima desejado.",
      },
      {
        n: "02",
        title: "Montamos a proposta",
        text: "Sugerimos o formato mais coerente com a cultura da empresa e a experiência desejada.",
      },
      {
        n: "03",
        title: "Executamos com cuidado",
        text: "Sua equipe vive algo organizado, bonito e memorável do começo ao fim.",
      },
    ],
    finalTitle: "Vamos desenhar uma experiência à altura do seu time?",
    finalText:
      "Se a ideia é criar algo mais marcante do que um evento corporativo comum, a gente pode construir isso junto com você.",
    ctaText: "Quero montar uma proposta",
    waMsg:
      "Olá! Quero entender melhor uma proposta da Camaleão para empresas. Podemos conversar sobre o perfil da minha equipe?",
    sideImage: companyMedia("Saneares/camaleaoecoturismo_1752955384_3680378971366991789_42300883601_1.jpg"),
    supportImage: companyMedia("Quartier Interiores/camaleaoecoturismo_1764452943_3776827493165752983_42300883601_5.jpg"),
    sampleImages: [
      companyMedia("Saneares/camaleaoecoturismo_1752955384_3680378971366923405_42300883601_2.jpg"),
      companyMedia("Quartier Interiores/camaleaoecoturismo_1764452943_3776827493157324776_42300883601_2.jpg"),
      companyMedia("EngenhARQ/camaleaoecoturismo_1748734060_3644967940809670753_42300883601_7.jpg"),
    ],
  },
  escolas: {
    color: "#820AD1",
    tint: "from-[#1e1327]/80 via-[#4c2368]/55 to-[#820AD1]/30",
    heroEyebrow: "Saídas pedagógicas com intenção",
    heroTitle: "Experiências educativas fora da sala de aula, com natureza, segurança e significado.",
    heroSub:
      "Planejamos vivências para escolas que querem transformar conteúdo em experiência prática, ampliar repertório dos alunos e criar lembranças que realmente educam.",
    heroHighlights: [
      "Roteiros pensados conforme faixa etária e proposta pedagógica",
      "Aprendizagem vivencial em ambiente natural",
      "Planejamento cuidadoso para grupos escolares",
    ],
    badge: "Para escolas que querem mais do que um passeio",
    audienceTitle: "Quando essa solução faz sentido",
    audienceText:
      "Ideal para instituições que enxergam a saída de campo como parte da formação do aluno, e não apenas como uma atividade complementar.",
    idealFor: [
      "Escolas que desejam excursões com intencionalidade pedagógica",
      "Turmas em projetos sobre meio ambiente, território e sustentabilidade",
      "Experiências de convivência, sensibilização e ampliação de repertório",
      "Saídas que precisam equilibrar aprendizado, engajamento e organização",
    ],
    deliverTitle: "Formatos que podem compor a experiência",
    deliverText:
      "A proposta pode assumir diferentes formatos conforme série, objetivo educacional, tempo disponível e dinâmica da escola.",
    formats: [
      {
        title: "Excursão pedagógica",
        desc: "Vivência de campo para aprofundar conteúdos e criar aprendizagem concreta.",
        points: [
          "Mais conexão entre teoria e prática",
          "Vivência orientada em ambiente natural",
          "Experiência memorável para alunos e educadores",
        ],
      },
      {
        title: "Educação ambiental",
        desc: "Experiências que despertam observação, cuidado e vínculo com a natureza.",
        points: [
          "Fauna, flora e ecossistemas locais",
          "Consciência ambiental na prática",
          "Sensibilização com linguagem acessível",
        ],
      },
      {
        title: "Saída temática",
        desc: "Roteiros desenhados para projetos específicos, semanas pedagógicas ou objetivos do colégio.",
        points: [
          "Adaptação por faixa etária",
          "Experiência sob medida",
          "Melhor aderência ao projeto da escola",
        ],
      },
    ],
    whyTitle: "O que gera mais confiança para a escola",
    whyText:
      "A Camaleão entende a responsabilidade de conduzir grupos escolares — a experiência é pensada com organização, intenção pedagógica e cuidado com cada etapa.",
    guarantees: [
      "Planejamento alinhado ao perfil da turma e ao objetivo da escola",
      "Linguagem adequada para diferentes faixas etárias",
      "Experiência que combina aprendizado, vivência e encantamento",
      "Condução com atenção à dinâmica do grupo e ao contexto escolar",
    ],
    sampleTitle: "Exemplos de experiências possíveis",
    sampleText:
      "Cada saída é planejada com a escola — veja possibilidades que podem se encaixar no seu contexto pedagógico.",
    examples: [
      {
        title: "Vivência sobre ecossistemas locais",
        desc: "Roteiro para observar, interpretar e discutir a natureza a partir do território.",
        meta: "Ideal para ensino fundamental e médio",
      },
      {
        title: "Saída de sensibilização ambiental",
        desc: "Experiência para ampliar repertório, percepção e vínculo com o meio ambiente.",
        meta: "Ideal para projetos interdisciplinares",
      },
      {
        title: "Excursão com foco em convivência e descoberta",
        desc: "Uma proposta que mistura aprendizado, socialização e experiência marcante para a turma.",
        meta: "Ideal para momentos de integração da escola",
      },
    ],
    steps: [
      {
        n: "01",
        title: "Escutamos a escola",
        text: "Entendemos a turma, a faixa etária, o objetivo da saída e as necessidades do grupo.",
      },
      {
        n: "02",
        title: "Desenhamos a proposta",
        text: "Montamos um roteiro coerente com a intenção pedagógica e a dinâmica da instituição.",
      },
      {
        n: "03",
        title: "Realizamos a experiência",
        text: "Os alunos vivem um momento rico, organizado e cheio de significado fora da sala de aula.",
      },
    ],
    finalTitle: "Quer planejar uma saída pedagógica mais significativa?",
    finalText:
      "A gente pode construir uma proposta que una natureza, experiência prática e cuidado com o contexto da sua escola.",
    ctaText: "Quero planejar com a escola",
    waMsg:
      "Olá! Quero conversar sobre uma proposta da Camaleão para minha escola. Podemos falar sobre a turma e o objetivo da saída?",
    sideImage: companyMedia("Turma de Psicologia - UFAL/camaleaoecoturismo_1714263304_3355806278024608285_42300883601_1.jpg"),
    supportImage: companyMedia("Turma de Psicologia - UFAL/camaleaoecoturismo_1714263304_3355806278007838970_42300883601_3.jpg"),
    sampleImages: [
      companyMedia("Turma de Psicologia - UFAL/camaleaoecoturismo_1714263304_3355806277982543875_42300883601_9.jpg"),
      companyMedia("Farofeiros da Trilha/camaleaoecoturismo_1746916888_3629724401779843165_42300883601_1.jpg"),
      companyMedia("Quartier Interiores/camaleaoecoturismo_1764452944_3776827493442519317_42300883601_8.jpg"),
    ],
  },
  grupos: {
    color: "#820AD1",
    tint: "from-[#1e1327]/80 via-[#4c2368]/55 to-[#820AD1]/30",
    heroEyebrow: "Passeios privativos e exclusivos",
    heroTitle: "Seu grupo, seu ritmo, sua ocasião: uma experiência desenhada só para vocês.",
    heroSub:
      "Criamos roteiros privativos para famílias, grupos de amigos e celebrações que merecem algo especial, sem cair no pacote genérico e sem dividir o momento com desconhecidos.",
    heroHighlights: [
      "Experiência exclusiva para o seu grupo",
      "Roteiros adaptados ao estilo da turma",
      "Mais conforto, flexibilidade e identidade",
    ],
    badge: "Para quem quer viver algo único com as pessoas certas",
    audienceTitle: "Quando essa solução faz sentido",
    audienceText:
      "É a escolha ideal para grupos que valorizam privacidade, personalização e a liberdade de viver a experiência no próprio ritmo.",
    idealFor: [
      "Famílias e grupos de amigos que querem exclusividade",
      "Celebrações como aniversários, encontros especiais e formaturas",
      "Pessoas que preferem um roteiro sob medida",
      "Turmas que querem conforto, praticidade e uma memória mais bonita",
    ],
    deliverTitle: "Formatos que podem ser construídos para o seu grupo",
    deliverText:
      "O passeio privativo pode assumir diferentes formas, dependendo da ocasião, da energia do grupo e do tipo de experiência desejada.",
    formats: [
      {
        title: "Passeio exclusivo",
        desc: "Uma experiência pensada para o seu grupo, sem mistura com outros participantes.",
        points: [
          "Mais privacidade e conforto",
          "Ritmo adequado à turma",
          "Experiência mais pessoal e memorável",
        ],
      },
      {
        title: "Celebração na natureza",
        desc: "Uma forma diferente de marcar datas especiais com atmosfera bonita e autêntica.",
        points: [
          "Aniversários e encontros marcantes",
          "Clima de celebração com propósito",
          "Roteiro pensado para a ocasião",
        ],
      },
      {
        title: "Roteiro sob medida",
        desc: "Montagem do passeio a partir do estilo do grupo, do nível de aventura e da data disponível.",
        points: [
          "Mais aderência ao perfil da turma",
          "Escolhas mais inteligentes",
          "Experiência com identidade própria",
        ],
      },
    ],
    whyTitle: "O que deixa a experiência mais premium",
    whyText:
      "O passeio privativo não é uma versão fechada do passeio comum — é uma experiência pensada do zero, com exclusividade, cuidado e liberdade para o seu grupo.",
    guarantees: [
      "Escuta do perfil do grupo antes da montagem do roteiro",
      "Sugestões conforme ocasião, preferências e energia da turma",
      "Mais autonomia para viver o passeio no próprio ritmo",
      "Experiência com mais identidade, conforto e intenção",
    ],
    sampleTitle: "Algumas possibilidades para inspirar",
    sampleText:
      "Cada grupo é único — aqui estão formatos que já funcionaram bem para quem buscou exclusividade e personalização.",
    examples: [
      {
        title: "Fim de semana especial com amigos",
        desc: "Um roteiro pensado para descanso, conexão e boas memórias em grupo.",
        meta: "Ideal para pequenos grupos e ocasiões especiais",
      },
      {
        title: "Experiência exclusiva para família",
        desc: "Passeio com ritmo mais confortável, privacidade e atenção ao perfil do grupo.",
        meta: "Ideal para famílias com perfis mistos",
      },
      {
        title: "Celebração fora do óbvio",
        desc: "Uma maneira mais bonita e significativa de marcar aniversários e encontros importantes.",
        meta: "Ideal para comemorações com identidade",
      },
    ],
    steps: [
      {
        n: "01",
        title: "Você conta o que imagina",
        text: "Número de pessoas, ocasião, estilo do grupo e data desejada.",
      },
      {
        n: "02",
        title: "Nós sugerimos o melhor formato",
        text: "Apresentamos um roteiro com mais aderência ao perfil da sua turma.",
      },
      {
        n: "03",
        title: "Vocês vivem algo só de vocês",
        text: "Uma experiência com liberdade, exclusividade e cara de lembrança boa.",
      },
    ],
    finalTitle: "Quer criar um passeio privativo do seu jeito?",
    finalText:
      "Se a ideia é reunir pessoas importantes em uma experiência exclusiva e bem pensada, a gente monta isso com você.",
    ctaText: "Quero um roteiro exclusivo",
    waMsg:
      "Olá! Quero montar um passeio privativo com a Camaleão para o meu grupo. Podemos conversar sobre o perfil da turma?",
    sideImage: companyMedia("Farofeiros da Trilha/camaleaoecoturismo_1746916888_3629724401779843165_42300883601_1.jpg"),
    supportImage: companyMedia("Uniodonto/camaleaoecoturismo_1745795077_3620313965896440272_42300883601_1.jpg"),
    sampleImages: [
      companyMedia("Uniodonto/camaleaoecoturismo_1745795077_3620313965879673562_42300883601_2.jpg"),
      companyMedia("Grupo Giseng/camaleaoecoturismo_1705096273_3278907653114152875_42300883601_1.jpg"),
      companyMedia("Sicredi/camaleaoecoturismo_1733012201_3513083430263102556_42300883601_1.jpg"),
    ],
  },
};

const TRUST_NUMBERS = [
  { value: "+5.000", label: "pessoas atendidas" },
  { value: "+50", label: "grupos e organizações" },
  { value: "6 anos", label: "de experiência" },
];

export default function Organizacoes() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tipo");
  const tab: Tab = raw === "escolas" || raw === "grupos" ? raw : "empresas";
  const setTab = (t: Tab) => setParams({ tipo: t }, { replace: true });
  const [partners, setPartners] = useState<Partner[]>([]);
  const [openCase, setOpenCase] = useState<(typeof SHARED_CASES)[number] | null>(null);

  useEffect(() => {
    supabase
      .from("partner_organizations" as never)
      .select("id, name, logo_url, website_url")
      .eq("active", true)
      .order("display_order")
      .then(({ data }) => {
        if (data) setPartners(data as unknown as Partner[]);
      });
  }, []);

  const d = CONTENT[tab];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopMenu />

      {/* ── Hero: foto + gradiente apenas ──────────────────────────── */}
      <section className="relative overflow-hidden bg-stone-950">
        <div className="relative aspect-[16/7] min-h-[280px] w-full md:aspect-[16/6] lg:aspect-[16/5]">
          <img
            src={d.sideImage}
            alt={d.heroTitle}
            className="h-full w-full object-cover object-center"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-stone-950" />
        </div>
      </section>

      {/* ── Conteúdo do hero: abaixo da foto ──────────────────────── */}
      <section className="border-b border-border bg-stone-950">
        <div className="mx-auto max-w-7xl px-4 pb-14 pt-10 md:px-6 lg:pb-20">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/85">
                {d.heroEyebrow}
              </span>
              <h1 className="mt-5 max-w-3xl font-serif text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
                {d.heroTitle}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/82 sm:text-lg">
                {d.heroSub}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={waLink(d.waMsg)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-stone-900 transition-transform hover:-translate-y-0.5"
                >
                  <MessageCircle className="h-4 w-4" />
                  {d.ctaText}
                </a>
                <a
                  href="#formatos"
                  className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/14 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/20"
                >
                  Ver formatos
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              <div className="mt-10 rounded-[28px] border border-white/12 bg-white/8 p-4">
                <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">
                      Escolha o perfil
                    </p>
                    <p className="mt-1 text-lg font-medium text-white">
                      Selecione abaixo para ver a proposta certa para o seu caso
                    </p>
                  </div>
                  <p className="text-sm text-white/80">
                    O conteúdo muda conforme sua escolha
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  {TABS.map((item) => {
                    const Icon = item.icon;
                    const active = item.id === tab;
                    return (
                      <button
                        key={`hero-${item.id}`}
                        onClick={() => setTab(item.id)}
                        className={`rounded-2xl border p-4 text-left transition-all ${
                          active
                            ? "border-white bg-white text-stone-900 shadow-xl"
                            : "border-white/14 bg-white/6 text-white hover:bg-white/12"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                              active ? "bg-primary/10 text-primary" : "bg-white/10 text-white"
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold">{item.label}</p>
                              {active && (
                                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                                  Ativo
                                </span>
                              )}
                            </div>
                            <p className={`mt-1 text-sm leading-6 ${active ? "text-muted-foreground" : "text-white/76"}`}>
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {d.heroHighlights.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/14 bg-white/8 p-4"
                  >
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/12">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-sm leading-6 text-white/88">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/12 bg-white/8 p-5 shadow-2xl">
              <div className="rounded-[24px] bg-white/6 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">
                  Proposta Camaleão
                </p>
                <p className="mt-3 text-2xl font-semibold leading-tight text-white">
                  {d.badge}
                </p>
                <p className="mt-4 text-sm leading-6 text-white/85">
                  Clareza de proposta, segurança de operação e personalização que justifica a escolha.
                </p>

                <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-6">
                  {TRUST_NUMBERS.map((item) => (
                    <div key={item.label}>
                      <p className="text-2xl font-semibold text-white">{item.value}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-white/75">
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-white/6 p-4">
                  <p className="text-sm font-medium text-white">Atendimento consultivo</p>
                  <p className="mt-2 text-sm leading-6 text-white/85">
                    Em vez de empurrar um pacote pronto, entendemos primeiro o contexto do
                    grupo para então sugerir o melhor formato.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <span className="hidden text-xs font-medium text-muted-foreground md:block mr-2">
              Visualizando:
            </span>
            {TABS.map((item) => {
              const Icon = item.icon;
              const active = item.id === tab;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                    active
                      ? "border-transparent text-white shadow-md"
                      : "border-border bg-card text-foreground hover:border-foreground/20 hover:bg-muted/60"
                  }`}
                  style={active ? { backgroundColor: d.color } : undefined}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-[#f7f3ee]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-[0.14em]"
              style={{ color: d.color }}
            >
              {d.audienceTitle}
            </p>
            <h2 className="mt-4 max-w-xl font-serif text-3xl font-semibold leading-tight sm:text-4xl">
              {d.badge}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              {d.audienceText}
            </p>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_20px_80px_rgba(0,0,0,0.07)]">
            <div className="relative aspect-[16/10] overflow-hidden">
              <img
                src={d.supportImage}
                alt={d.badge}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <span className="inline-flex rounded-full bg-white/16 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                  Experiência real Camaleão
                </span>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-5 flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: d.color }}
                >
                  {tab === "empresas" ? (
                    <BriefcaseBusiness className="h-5 w-5" />
                  ) : tab === "escolas" ? (
                    <GraduationCap className="h-5 w-5" />
                  ) : (
                    <Users className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <p className="font-semibold">Ideal para</p>
                  <p className="text-sm text-muted-foreground">Situações em que o formato certo faz diferença</p>
                </div>
              </div>

              <div className="grid gap-3">
                {d.idealFor.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl bg-muted/45 px-4 py-4">
                    <span
                      className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: d.color }}
                    />
                    <p className="text-sm leading-6 text-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="formatos" className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <div className="max-w-3xl">
            <p
              className="text-xs font-semibold uppercase tracking-[0.14em]"
              style={{ color: d.color }}
            >
              O que entregamos
            </p>
            <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight sm:text-4xl">
              {d.deliverTitle}
            </h2>
            <p className="mt-5 text-base leading-7 text-muted-foreground">{d.deliverText}</p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {d.formats.map((format, index) => (
              <article
                key={format.title}
                className="group relative overflow-hidden rounded-[28px] border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div
                  className="absolute left-0 top-0 h-1.5 w-full"
                  style={{ backgroundColor: d.color }}
                />
                <div className="mb-6 flex items-center justify-between">
                  <span
                    className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]"
                    style={{ backgroundColor: `${d.color}18`, color: d.color }}
                  >
                    Formato {index + 1}
                  </span>
                  {index === 0 ? (
                    <TreePine className="h-5 w-5 text-muted-foreground" />
                  ) : index === 1 ? (
                    <CalendarRange className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Star className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                <h3 className="text-2xl font-semibold leading-tight">{format.title}</h3>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{format.desc}</p>

                <div className="mt-6 grid gap-3">
                  {format.points.map((point) => (
                    <div key={point} className="flex items-start gap-3">
                      <div
                        className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
                        style={{ backgroundColor: d.color }}
                      >
                        <Check className="h-3 w-3" />
                      </div>
                      <p className="text-sm leading-6 text-foreground">{point}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-[0.14em]"
                style={{ color: d.color }}
              >
                Por que escolher a Camaleão
              </p>
              <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight sm:text-4xl">
                {d.whyTitle}
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
                {d.whyText}
              </p>

              <div className="mt-8 space-y-4">
                {d.guarantees.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div
                      className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: d.color }}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-sm leading-6 text-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {GLOBAL_DIFFERENTIALS.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-[26px] border border-border bg-card p-6 shadow-sm"
                  >
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl text-white"
                      style={{ backgroundColor: d.color }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-[#fbf8f4]">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <div className="max-w-3xl">
            <p
              className="text-xs font-semibold uppercase tracking-[0.14em]"
              style={{ color: d.color }}
            >
              Cases reais
            </p>
            <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight sm:text-4xl">
              Grupos que já viveram isso com a Camaleão
            </h2>
            <p className="mt-5 text-base leading-7 text-muted-foreground">
              Veja como empresas, escolas e grupos privativos viveram experiências feitas sob medida — na natureza, com integração, presença e memória afetiva.
            </p>
          </div>

          <div className="mt-10">
            <Carousel opts={{ align: "start", loop: true }} className="px-12">
              <CarouselContent className="-ml-5">
                {SHARED_CASES.map((item) => (
                  <CarouselItem key={item.company} className="pl-5 md:basis-[88%] lg:basis-[78%]">
                    <article className="overflow-hidden rounded-[30px] border border-border bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
                      <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
                        <div className="relative min-h-[320px] overflow-hidden bg-stone-950">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                          <div className="absolute left-5 top-5 rounded-full bg-black/55 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                            {item.company}
                          </div>
                          <button
                            type="button"
                            onClick={() => setOpenCase(item)}
                            className="absolute bottom-5 left-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-900 transition-transform hover:-translate-y-0.5"
                          >
                            <Play className="h-4 w-4 fill-current" />
                            Assistir case
                          </button>
                        </div>

                        <div className="flex flex-col justify-between p-6 md:p-8">
                          <div>
                            <p
                              className="text-xs font-semibold uppercase tracking-[0.22em]"
                              style={{ color: d.color }}
                            >
                              {item.audience}
                            </p>
                            <h3 className="mt-3 text-2xl font-semibold leading-tight text-foreground md:text-3xl">
                              {item.title}
                            </h3>
                            <p className="mt-4 text-sm leading-7 text-muted-foreground">
                              {item.summary}
                            </p>
                            <div className="mt-6 rounded-2xl bg-muted/45 p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                O que esse grupo viveu
                              </p>
                              <p className="mt-2 text-sm leading-7 text-foreground">{item.result}</p>
                            </div>
                          </div>

                          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-border bg-card px-4 py-4">
                            <div
                              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: d.color }}
                            />
                            <p className="text-sm leading-6 text-foreground">{item.highlight}</p>
                          </div>
                        </div>
                      </div>
                    </article>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-0 h-11 w-11" />
              <CarouselNext className="right-0 h-11 w-11" />
            </Carousel>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <div className="max-w-3xl">
            <p
              className="text-xs font-semibold uppercase tracking-[0.14em]"
              style={{ color: d.color }}
            >
              Exemplos de propostas
            </p>
            <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight sm:text-4xl">
              {d.sampleTitle}
            </h2>
            <p className="mt-5 text-base leading-7 text-muted-foreground">{d.sampleText}</p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {d.examples.map((item, index) => (
              <article
                key={item.title}
                className="overflow-hidden rounded-[28px] border border-border bg-card"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={d.sampleImages[index] || d.supportImage}
                    alt={item.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/5" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/90">
                      {item.meta}
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold leading-tight text-white">
                      {item.title}
                    </h3>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-sm leading-6 text-muted-foreground">{item.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {partners.length > 0 && (
        <section className="border-b border-border bg-[#fbf8f4]">
          <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
            <div className="max-w-3xl">
              <p
                className="text-xs font-semibold uppercase tracking-[0.14em]"
                style={{ color: d.color }}
              >
                Prova de confiança
              </p>
              <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight sm:text-4xl">
                Organizações que já confiaram na Camaleão
              </h2>
              <p className="mt-5 text-base leading-7 text-muted-foreground">
                Organizações de diferentes setores já escolheram a Camaleão para seus grupos — e voltaram para contar.
              </p>
            </div>

            <div className="mt-10 rounded-[30px] border border-black/5 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.06)]">
              <div className="grid grid-cols-2 items-center gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
                {partners.map((partner) => (
                  <a
                    key={partner.id}
                    href={partner.website_url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-[92px] items-center justify-center rounded-2xl border border-border/60 px-4 py-4 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm"
                    title={partner.name}
                  >
                    <img
                      src={partner.logo_url}
                      alt={partner.name}
                      className="h-16 w-auto max-w-full object-contain grayscale transition-all duration-300 hover:grayscale-0"
                    />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p
                className="text-xs font-semibold uppercase tracking-[0.14em]"
                style={{ color: d.color }}
              >
                Como funciona
              </p>
              <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight sm:text-4xl">
                Um processo simples, mas com mais cara de consultoria do que de pacote pronto
              </h2>
            </div>
            <div className="rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
              Clareza, alinhamento e experiência bem executada
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {d.steps.map((step) => (
              <article
                key={step.n}
                className="relative overflow-hidden rounded-[28px] border border-border bg-card p-6 shadow-sm"
              >
                <span
                  className="block text-6xl font-semibold leading-none opacity-12"
                  style={{ color: d.color }}
                >
                  {step.n}
                </span>
                <h3 className="mt-5 text-2xl font-semibold leading-tight">{step.title}</h3>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${d.color} 0%, ${d.color}dd 45%, #1f1a17 100%)`,
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_26%)]" />
        <div className="relative mx-auto max-w-5xl px-4 py-20 text-center md:px-6">
          <div className="mx-auto max-w-3xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 text-white backdrop-blur-sm">
              {tab === "empresas" ? (
                <Building2 className="h-6 w-6" />
              ) : tab === "escolas" ? (
                <Bus className="h-6 w-6" />
              ) : (
                <Users className="h-6 w-6" />
              )}
            </div>
            <h2 className="mt-6 font-serif text-3xl font-semibold leading-tight text-white sm:text-4xl">
              {d.finalTitle}
            </h2>
            <p className="mt-5 text-base leading-7 text-white/82">{d.finalText}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href={waLink(d.waMsg)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-stone-900 transition-transform hover:-translate-y-0.5"
              >
                <MessageCircle className="h-4 w-4" />
                {d.ctaText}
              </a>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/18 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/16"
              >
                Voltar ao topo
              </button>
            </div>
          </div>
        </div>
      </section>

      <Dialog open={Boolean(openCase)} onOpenChange={(open) => !open && setOpenCase(null)}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-hidden border-0 bg-black p-0">
          {openCase && (
            <div className="bg-black">
              <video
                key={openCase.video}
                src={openCase.video}
                poster={openCase.image}
                className="max-h-[78vh] w-full bg-black object-contain"
                controls
                autoPlay
                playsInline
                preload="metadata"
              />
              <div className="border-t border-white/10 px-5 py-4 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                  {openCase.company}
                </p>
                <p className="mt-2 text-lg font-semibold">{openCase.title}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
