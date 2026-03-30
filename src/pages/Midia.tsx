import { useState, useRef } from "react";
import { TopMenu } from "@/components/TopMenu";
import Footer from "@/components/Footer";
import bannerSobre from "@/assets/banner-sobre.png";
import palestra1 from "@/assets/palestra-1.avif";
import palestra2 from "@/assets/palestra-2.avif";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";

// ── Vídeos ──────────────────────────────────────────────────────────────────
const VIDEOS = [
  {
    id: "0w632v-LLkg",
    title: "Passeio pelo Rio São Miguel com Gilka Mafra",
    description:
      "Levamos a apresentadora da TV Gazeta para conhecer um de nossos roteiros exclusivos: a Rota do Rio São Miguel.",
  },
  {
    id: "le7Kc2xc7-M",
    title: "Ecoturismo e Psicologia",
    description:
      "Nessa palestra para o IFAL, falamos sobre os benefícios que a prática do ecoturismo pode trazer para a saúde mental.",
  },
  {
    id: "lA0rJq6dEnw",
    title: "Por quê acampamos?",
    description:
      "Nesse documentário mostramos o porquê acampar pode ser a melhor forma de dar um reset mental. Assista!",
  },
  {
    id: "tt6_CBO60kQ",
    title: "Desbravando o Lago Azul",
    description:
      "Nesse vlog mostramos a trajetória até chegar ao Lago Azul: um oásis no meio da mata, em São Miguel dos Campos.",
  },
];

// ── Matérias ─────────────────────────────────────────────────────────────────
const MATERIAS = [
  {
    veiculo: "TRIBUNAHOJE",
    veiculoColor: "#c0392b",
    title: "Camaleão Ecoturismo é Reconhecida como Melhor Agência de Ecoturismo de Alagoas em 2023",
    thumb: "https://img.youtube.com/vi/0w632v-LLkg/hqdefault.jpg",
    text: "Durante a cerimônia do 6º Prêmio Oscar Alagoano, promovido pela Revista Class Magazine e Claudio Bulgarelli Comunicação, a Camaleão Ecoturismo foi premiada como a melhor agência de ecoturismo de Alagoas em 2023...",
    link: "https://tribunahoje.com/noticias/cidades/2022/11/22/112399-revista-class-magazine-e-claudio-bulgarelli-comunicacao-entregam-no-dia-12-de-dezembro-o-6o-premio-oscar-alagoano",
  },
  {
    veiculo: "globoplay",
    veiculoColor: "#e5007d",
    title: "Passeio pelo Rio São Miguel - TV Gazeta #IssoÉAlagoas com Gilka Mafra",
    thumb: "https://img.youtube.com/vi/0w632v-LLkg/hqdefault.jpg",
    text: "Essa reportagem apresenta a experiência de Gilka Mafra, da TV Gazeta, durante um passeio organizado pela Camaleão Ecoturismo pelo Rio São Miguel, em São Miguel dos Campos. A aventura combina turismo sustentável e valorização cultural...",
    link: "https://www.youtube.com/watch?v=0w632v-LLkg",
  },
  {
    veiculo: "AlagoasWeb",
    veiculoColor: "#1a6fab",
    title: "Rota de turismo regenerativo: Uma iniciativa promissora para São Miguel dos Campos",
    thumb: "https://img.youtube.com/vi/tt6_CBO60kQ/hqdefault.jpg",
    text: "Um projeto inovador que combina preservação ambiental, reflorestamento de manguezais e desenvolvimento sustentável, gerando emprego, renda e valorização da comunidade local, com o objetivo de alcançar reconhecimento internacional como destino sustentável...",
    link: "https://alagoasweb.com/rota-de-turismo-regenerativo-uma-iniciativa-promiss/",
  },
  {
    veiculo: "Instituto Federal",
    veiculoColor: "#2e7d32",
    title: "Experiências ecológicas, autoconhecimento e turismo criativo",
    thumb: "https://img.youtube.com/vi/le7Kc2xc7-M/hqdefault.jpg",
    text: "O V Hosptur debateu estratégias inovadoras para o turismo em tempos de crise. Isaías Christian, da Camaleão Ecoturismo, destacou o turismo ecológico como ferramenta de autoconhecimento e saúde mental, promovendo uma \"ecologia da alma\"...",
    link: "https://www2.ifal.edu.br/campus/maceio/noticias/experiencias-ecologicas-autoconhecimento-e-turismo-criativo-v-hosptur-debate-tendencias-inovadoras-em-segundo-dia-do-evento",
  },
  {
    veiculo: "Investindo por Aí",
    veiculoColor: "#e67e22",
    title: "Ecoturismo no Nordeste fomenta desenvolvimento regional",
    thumb: "https://img.youtube.com/vi/lA0rJq6dEnw/hqdefault.jpg",
    text: "A reportagem aborda o crescimento do ecoturismo no Nordeste como ferramenta de desenvolvimento econômico e preservação ambiental. O segmento representa um quarto das viagens...",
    link: "https://investindoporai.com.br/exclusivo-ecoturismo-no-nordeste-fomenta-desenvolvimento-regional/",
  },
  {
    veiculo: "G1",
    veiculoColor: "#c0392b",
    title: "Expedição pelo Rio São Miguel atrai aventureiros e contribui para a economia de São Miguel dos Campos, AL",
    thumb: "https://img.youtube.com/vi/0w632v-LLkg/hqdefault.jpg",
    text: "A reportagem destaca o sucesso das expedições pelo Rio São Miguel, organizadas por Isaías Christian em São Miguel dos Campos, Alagoas. O passeio, que dura cerca de 4 horas e meia, oferece experiências na Mata Atlântica preservada...",
    link: "https://g1.globo.com/al/alagoas/issoealagoas/noticia/2023/05/13/expedicao-pelo-rio-sao-miguel-atrai-aventureiros-e-contribui-para-a-economia-de-sao-miguel-dos-campos-al.ghtml",
  },
];

// ── Palestras ────────────────────────────────────────────────────────────────
const PALESTRAS = [
  {
    img: palestra1,
    title: "Reconectando com a Natureza: A Essência da Camaleão Ecoturismo",
    text: "No evento de empreendedorismo no IFAL de São Miguel dos Campos, apresentei a essência da Camaleão Ecoturismo, cuja missão é reconectar pessoas com a natureza. Destacamos como nossas experiências unem sustentabilidade, bem-estar e valorização ambiental, promovendo transformação e desenvolvimento local.",
  },
  {
    img: palestra2,
    title: "Uma Trajetória Inspiradora Apresentada no IFAL de Marechal Deodoro",
    text: "Nessa palestra, apresentamos a trajetória da Camaleão Ecoturismo, compartilhando experiências, desafios e aprendizados do empreendedorismo no ecoturismo. Inspiramos os alunos do curso de Guia de Turismo do IFAL de Marechal Deodoro a explorar a conexão entre turismo sustentável e desenvolvimento local.",
  },
];

// ── Netflix Videos ────────────────────────────────────────────────────────────
function NetflixVideos() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: -1 | 1) => {
    const el = rowRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <section className="bg-[#0f0f12] py-10">
      <div className="px-4 md:px-8 mb-4 flex items-center justify-between max-w-none">
        <h2 className="text-white text-xl md:text-2xl font-bold tracking-tight">
          Documentários e entrevistas
        </h2>
      </div>

      <div className="relative group">
        {/* Scroll row */}
        <div
          ref={rowRef}
          className="flex gap-3 overflow-x-auto px-4 md:px-8 pb-4 scroll-smooth"
          style={{ scrollbarWidth: "none" }}
        >
          {VIDEOS.map((v) => (
            <div
              key={v.id}
              className="shrink-0 w-72 md:w-80 cursor-pointer group/card"
              onClick={() => setActiveId(activeId === v.id ? null : v.id)}
            >
              {/* Thumbnail card */}
              <div className="relative aspect-video rounded-lg overflow-hidden bg-black shadow-lg ring-2 ring-transparent group-hover/card:ring-white/40 transition-all duration-200 group-hover/card:scale-[1.03] origin-left">
                <img
                  src={`https://img.youtube.com/vi/${v.id}/hqdefault.jpg`}
                  alt={v.title}
                  className="w-full h-full object-cover opacity-80 group-hover/card:opacity-100 transition-opacity"
                />
                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center group-hover/card:bg-white/90 transition-colors">
                    <Play className="h-5 w-5 text-white group-hover/card:text-black fill-current transition-colors" />
                  </div>
                </div>
                {/* Bottom gradient + title */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-3 py-3">
                  <p className="text-white text-xs font-semibold leading-tight line-clamp-2">{v.title}</p>
                </div>
              </div>
              <p className="text-gray-400 text-xs mt-2 line-clamp-2 leading-relaxed px-0.5">{v.description}</p>
            </div>
          ))}
        </div>

        {/* Arrows */}
        <button
          onClick={() => scroll(-1)}
          className="absolute left-0 top-[40%] -translate-y-1/2 h-[calc(100%-1rem)] w-10 bg-gradient-to-r from-black/70 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-start pl-1"
        >
          <ChevronLeft className="h-7 w-7" />
        </button>
        <button
          onClick={() => scroll(1)}
          className="absolute right-0 top-[40%] -translate-y-1/2 h-[calc(100%-1rem)] w-10 bg-gradient-to-l from-black/70 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end pr-1"
        >
          <ChevronRight className="h-7 w-7" />
        </button>
      </div>

      {/* Expanded player */}
      {activeId && (
        <div className="px-4 md:px-8 mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-w-3xl aspect-video rounded-xl overflow-hidden shadow-2xl">
            <iframe
              src={`https://www.youtube.com/embed/${activeId}?autoplay=1`}
              title="Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
          <button
            onClick={() => setActiveId(null)}
            className="mt-3 text-gray-400 text-xs hover:text-white transition-colors"
          >
            ✕ Fechar
          </button>
        </div>
      )}
    </section>
  );
}

// ── Carrossel genérico ────────────────────────────────────────────────────────
function Carousel({ total, children, dark = false }: { total: number; dark?: boolean; children: (idx: number, setIdx: (i: number) => void) => React.ReactNode }) {
  const [idx, setIdx] = useState(0);
  const arrowBase = "absolute top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-200";
  const arrowStyle = dark
    ? "bg-white text-[#820AD1] hover:bg-white/90"
    : "bg-[#820AD1] text-white hover:bg-[#6a08ab]";

  return (
    <div className="relative px-12 md:px-16">
      {children(idx, setIdx)}
      {/* Arrows */}
      <button
        onClick={() => setIdx(Math.max(0, idx - 1))}
        disabled={idx === 0}
        className={`${arrowBase} left-0 ${arrowStyle} disabled:opacity-20 disabled:cursor-not-allowed`}
        aria-label="Anterior"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={() => setIdx(Math.min(total - 1, idx + 1))}
        disabled={idx === total - 1}
        className={`${arrowBase} right-0 ${arrowStyle} disabled:opacity-20 disabled:cursor-not-allowed`}
        aria-label="Próximo"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
      {/* Dots */}
      <div className="flex justify-center gap-2 mt-6">
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`w-3 h-3 rounded-full transition-colors ${i === idx ? (dark ? "bg-white" : "bg-[#820AD1]") : (dark ? "bg-white/40" : "bg-[#820AD1]/30")}`}
            aria-label={`Ir para item ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function Midia() {
  return (
    <div className="min-h-screen bg-background">
      <TopMenu />

      {/* Hero banner */}
      <div className="relative w-full h-48 md:h-64 overflow-hidden">
        <img src={bannerSobre} alt="Camaleão na Mídia" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/55 flex flex-col justify-end px-6 pb-6 md:px-10 md:pb-8">
          <h1 className="font-bold text-4xl md:text-5xl text-white leading-none">Camaleão na Mídia</h1>
        </div>
      </div>

      {/* ── Seção 1: Documentários e entrevistas — estilo Netflix ── */}
      <NetflixVideos />

      {/* ── Seção 2: Matérias e reportagens ── */}
      <section className="py-12 px-4 bg-[#820AD1]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center text-2xl md:text-3xl font-bold text-white mb-10">
            Matérias e reportagens
          </h2>
          <Carousel total={MATERIAS.length} dark>
            {(idx) => {
              const m = MATERIAS[idx];
              return (
                <div className="max-w-2xl mx-auto bg-white rounded-2xl p-6 shadow-xl">
                  <h3 className="font-bold text-gray-900 text-lg leading-snug mb-4">{m.title}</h3>
                  <div className="relative rounded-xl overflow-hidden mb-4">
                    <img src={m.thumb} alt={m.title} className="w-full object-cover aspect-video" />
                    <span
                      className="absolute top-3 right-3 text-white text-xs font-bold px-2.5 py-1 rounded-md shadow"
                      style={{ backgroundColor: m.veiculoColor }}
                    >
                      {m.veiculo}
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed text-justify mb-5">{m.text}</p>
                  <div className="text-center">
                    <a
                      href={m.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block border border-[#820AD1] text-[#820AD1] font-semibold text-sm px-8 py-3 rounded-full hover:bg-[#820AD1] hover:text-white transition-colors"
                    >
                      Ver matéria completa
                    </a>
                  </div>
                </div>
              );
            }}
          </Carousel>
        </div>
      </section>

      {/* ── Seção 3: Palestras e apresentações ── */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center text-2xl md:text-3xl font-bold text-[#820AD1] mb-10">
            Palestras e apresentações
          </h2>
          <Carousel total={PALESTRAS.length}>
            {(idx) => {
              const p = PALESTRAS[idx];
              return (
                <div className="max-w-2xl mx-auto">
                  <div className="w-full rounded-2xl overflow-hidden mb-6 shadow-md">
                    <img src={p.img} alt={p.title} className="w-full object-cover" />
                  </div>
                  <h3 className="text-[#820AD1] font-bold text-lg text-center leading-snug mb-3">{p.title}</h3>
                  <p className="text-gray-700 text-sm leading-relaxed text-justify">{p.text}</p>
                </div>
              );
            }}
          </Carousel>
        </div>
      </section>

      <Footer />
    </div>
  );
}
