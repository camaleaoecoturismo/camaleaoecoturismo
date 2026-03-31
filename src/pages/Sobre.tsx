import { Link } from "react-router-dom";
import camping from "@/assets/camping.png";
import equipe from "@/assets/colaboradores/equipe.avif";
import isaias from "@/assets/colaboradores/Isaias.avif";
import { TopMenu } from "@/components/TopMenu";
import Footer from "@/components/Footer";
import { FloatingContactButton } from "@/components/FloatingContactButton";
import { ArrowRight } from "lucide-react";

// ─── Números ──────────────────────────────────────────────────────────────────
const STATS = [
  { value: "6",     suffix: " anos",      label: "de história" },
  { value: "+5mil", suffix: "",           label: "pessoas atendidas" },
  { value: "+25",   suffix: " roteiros",  label: "diferentes" },
  { value: "2023",  suffix: "",           label: "melhor agência de ecoturismo de AL" },
];

export default function Sobre() {
  return (
    <div className="min-h-screen bg-white">
      <TopMenu />

      {/* ── Hero ── */}
      <div className="relative w-full h-[55vh] md:h-[65vh] overflow-hidden">
        <img
          src={camping}
          alt="Camaleão Ecoturismo"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 flex flex-col items-start justify-end px-6 pb-10 md:px-16 md:pb-14 max-w-5xl mx-auto w-full left-0 right-0">
          <p className="text-white/60 text-xs uppercase tracking-widest font-semibold mb-3">
            Maceió, Alagoas — desde 2020
          </p>
          <h1 className="font-black text-5xl md:text-7xl text-white leading-none tracking-tight">
            SOMOS DA<br />NATUREZA.
          </h1>
        </div>
      </div>

      {/* ── Frase de abertura ── */}
      <section className="py-16 md:py-20 px-6 md:px-16 max-w-5xl mx-auto">
        <p className="font-bold text-2xl md:text-4xl text-[#820AD1] leading-snug max-w-3xl">
          A Camaleão nasceu da crença de que a natureza tem o poder de transformar pessoas — e que Alagoas guarda experiências que o mundo ainda não conhece.
        </p>
      </section>

      {/* ── História ── */}
      <section className="px-6 md:px-16 pb-16 max-w-5xl mx-auto grid md:grid-cols-2 gap-12 md:gap-20 items-start">
        {/* Texto */}
        <div className="space-y-6 text-foreground/75 text-base leading-relaxed">
          <p>
            Tudo começou com Isaías Christian — psicólogo que descobriu, no meio da mata, que a natureza faz pelo ser humano o que nenhum consultório consegue sozinho. Em vez de abandonar a psicologia, ele decidiu uni-la ao ecoturismo. A Camaleão nasceu dessa fusão: aventura com propósito.
          </p>
          <p>
            O primeiro roteiro foi o Rio São Miguel, em São Miguel dos Campos — um rio escondido entre margens de Mata Atlântica preservada, completamente desconhecido pelo turismo de massa. Era exatamente o tipo de lugar que a Camaleão queria apresentar ao mundo.
          </p>
          <p>
            De lá pra cá a empresa cresceu para além de Alagoas. Hoje operamos roteiros por todo o Nordeste — e quando a natureza chama, chegamos até onde for preciso pelo Brasil. Mais de 5.000 pessoas levadas à natureza, dezenas de roteiros criados e um prêmio de melhor agência de ecoturismo de Alagoas em 2023. Mas o que mais nos orgulha não está em nenhum troféu: é a mensagem que chega depois de cada passeio. "Isso me curou." "Nunca me senti tão vivo." "Já marquei o próximo."
          </p>
          <p>
            Hoje a Camaleão é um time de guias, educadores físicos, bombeiros civis e fotógrafos — todos unidos pela mesma paixão. Cada saída é pensada com cuidado. Cada grupo tratado como se fosse o primeiro.
          </p>
        </div>

        {/* Foto do Isaías */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl overflow-hidden aspect-[3/4] shadow-lg">
            <img
              src={isaias}
              alt="Isaías Christian — fundador da Camaleão"
              className="w-full h-full object-cover object-top"
            />
          </div>
          <div className="px-1">
            <p className="font-bold text-foreground text-sm">Isaías Christian</p>
            <p className="text-muted-foreground text-sm">
              Fundador · Guia de Turismo · Psicólogo
            </p>
          </div>
        </div>
      </section>

      {/* ── Números ── */}
      <section className="bg-[#820AD1] py-12 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-6">
          {STATS.map(({ value, suffix, label }) => (
            <div key={label} className="flex flex-col items-start">
              <span className="font-black text-4xl md:text-5xl text-white leading-none">
                {value}
                <span className="text-2xl md:text-3xl font-bold">{suffix}</span>
              </span>
              <span className="text-white/65 text-xs uppercase tracking-widest mt-2 leading-tight">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Foto acampamento ── */}
      <div className="w-full h-64 md:h-[420px] overflow-hidden">
        <img
          src={camping}
          alt="Acampamento Camaleão Ecoturismo"
          className="w-full h-full object-cover object-center"
        />
      </div>

      {/* ── O que nos move ── */}
      <section className="py-16 md:py-24 px-6 md:px-16 max-w-5xl mx-auto">
        <p className="text-[#820AD1] text-xs font-semibold uppercase tracking-widest mb-8">
          O que nos move
        </p>
        <div className="grid md:grid-cols-3 gap-10 md:gap-16">
          <div className="space-y-3">
            <h3 className="font-black text-foreground text-xl leading-tight">
              Acreditamos que a natureza é terapia.
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Uma tarde na natureza faz pelo equilíbrio mental o que meses de rotina não conseguem. Não é exagero — é o que mais de 5.000 pessoas já viveram com a gente.
            </p>
          </div>
          <div className="space-y-3">
            <h3 className="font-black text-foreground text-xl leading-tight">
              O Nordeste tem muito mais do que praias.
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Cachoeiras, rios, mangues, chapadas, mata fechada — o interior do Nordeste é um tesouro que a maioria das pessoas nunca explorou. A Camaleão existe para mudar isso, levando grupos de Alagoas ao Brasil inteiro.
            </p>
          </div>
          <div className="space-y-3">
            <h3 className="font-black text-foreground text-xl leading-tight">
              Segurança não é diferencial, é obrigação.
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Nosso time inclui bombeiros civis, guarda-vidas e instrutores certificados. Cada passeio tem protocolo. Porque aventura de verdade não é aventura na segurança — é aventura na natureza.
            </p>
          </div>
        </div>
      </section>

      {/* ── Equipe ── */}
      <section className="bg-[#f0f0f0] py-16 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-10 md:gap-16">
          <div className="flex-1 min-w-0">
            <div className="rounded-2xl overflow-hidden shadow-md aspect-video md:aspect-[4/3]">
              <img
                src={equipe}
                alt="Equipe Camaleão Ecoturismo"
                className="w-full h-full object-cover object-top"
              />
            </div>
          </div>
          <div className="flex-1 space-y-5">
            <p className="text-[#820AD1] text-xs font-semibold uppercase tracking-widest">
              As pessoas por trás das aventuras
            </p>
            <h2 className="font-black text-3xl md:text-4xl text-foreground leading-tight">
              Um time com uma paixão só.
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Guias, educadores físicos, bombeiros civis, fotógrafo, psicólogo, advogada — cada membro do time trouxe uma especialidade, mas todos chegaram pela mesma razão: o amor pela natureza e pelas pessoas.
            </p>
            <Link
              to="/equipe"
              className="inline-flex items-center gap-2 text-[#820AD1] font-bold text-sm hover:gap-3 transition-all"
            >
              Conheça o time <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Reconhecimentos ── */}
      <section className="py-16 px-6 md:px-16 max-w-5xl mx-auto">
        <p className="text-[#820AD1] text-xs font-semibold uppercase tracking-widest mb-10">
          Reconhecimentos
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              ano: "2023",
              titulo: "Melhor Agência de Ecoturismo de Alagoas",
              fonte: "6º Prêmio Oscar Alagoano · Revista Class Magazine",
            },
            {
              ano: "2023",
              titulo: "Expedição pelo Rio São Miguel no G1 Alagoas",
              fonte: "Globo · #IssoÉAlagoas com Gilka Mafra, TV Gazeta",
            },
            {
              ano: "2022",
              titulo: "Rota de Turismo Regenerativo",
              fonte: "Alagoas Web · IFAL · Investindo por Aí",
            },
          ].map(({ ano, titulo, fonte }) => (
            <div
              key={titulo}
              className="border border-border rounded-2xl p-6 flex flex-col gap-3"
            >
              <span className="text-[#820AD1] font-bold text-xs uppercase tracking-widest">
                {ano}
              </span>
              <p className="font-bold text-foreground text-base leading-snug">{titulo}</p>
              <p className="text-muted-foreground text-xs leading-relaxed">{fonte}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 text-right">
          <Link
            to="/midia"
            className="inline-flex items-center gap-1.5 text-[#820AD1] font-semibold text-sm hover:gap-2.5 transition-all"
          >
            Ver toda a cobertura na mídia <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative overflow-hidden bg-[#820AD1] py-20 px-6 text-center">
        {/* fundo decorativo */}
        <div className="absolute inset-0 opacity-10 pointer-events-none select-none flex items-center justify-center">
          <span className="font-black text-[28vw] text-white leading-none tracking-tighter whitespace-nowrap">
            NATUREZA
          </span>
        </div>
        <div className="relative max-w-2xl mx-auto flex flex-col items-center gap-5">
          <p className="text-white/60 text-xs uppercase tracking-widest font-semibold">
            A próxima aventura é sua
          </p>
          <h2 className="font-black text-4xl md:text-5xl text-white leading-tight">
            A natureza está esperando.<br />E a Camaleão também.
          </h2>
          <p className="text-white/70 text-base max-w-md">
            Escolha um destino, chame seus amigos e deixa que a gente cuida do resto. Do Nordeste ao Brasil todo.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-2">
            <Link
              to="/agenda"
              className="inline-flex items-center gap-2 bg-white text-[#820AD1] font-bold px-8 py-4 rounded-xl hover:bg-white/90 transition-colors shadow-xl text-sm"
            >
              Ver a agenda de passeios
            </Link>
            <a
              href="https://wa.me/5582993649454"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 border-2 border-white/40 text-white font-bold px-8 py-4 rounded-xl hover:bg-white/10 transition-colors text-sm"
            >
              Fale no WhatsApp
            </a>
          </div>
        </div>
      </section>

      <Footer />
      <FloatingContactButton />
    </div>
  );
}
