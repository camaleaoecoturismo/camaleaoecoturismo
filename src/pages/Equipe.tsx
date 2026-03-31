import { TopMenu } from "@/components/TopMenu";
import Footer from "@/components/Footer";
import { FloatingContactButton } from "@/components/FloatingContactButton";

// ── Fotos dos colaboradores ───────────────────────────────────────────────────
import equipe from "@/assets/colaboradores/equipe.avif";
import isaias from "@/assets/colaboradores/Isaias.avif";
import paula from "@/assets/colaboradores/Paula.avif";
import amanda from "@/assets/colaboradores/Amanda.avif";
import israel from "@/assets/colaboradores/Israel.avif";
import livia from "@/assets/colaboradores/Livia.avif";
import germano from "@/assets/colaboradores/Germano.avif";
import ernande from "@/assets/colaboradores/Ernande.avif";
import cristiano from "@/assets/colaboradores/Cristiano.avif";

// ── Dados ─────────────────────────────────────────────────────────────────────
const MEMBERS = [
  {
    nome: "Isaías Christian",
    cargo: "Diretor da Camaleão, Guia de Turismo e Psicólogo",
    foto: isaias,
  },
  {
    nome: "Paula Jatobá",
    cargo: "Sócia-proprietária e Advogada",
    foto: paula,
  },
  {
    nome: "Amanda Saôry",
    cargo: "Secretária e Guia de Turismo, Excursões Brasil + América do Sul",
    foto: amanda,
  },
  {
    nome: "Israel Christian",
    cargo: "Técnico em Meio Ambiente e Profissional de Educação Física",
    foto: israel,
  },
  {
    nome: "Lívia Barbosa",
    cargo: "Profissional de Educação Física e Apoio Técnico",
    foto: livia,
  },
  {
    nome: "Germano Lopes",
    cargo: "Bombeiro civil, Guarda-Vidas e Instrutor de Primeiros Socorros",
    foto: germano,
  },
  {
    nome: "Ernande Roberto",
    cargo: "Fotógrafo, Programador e Astrônomo",
    foto: ernande,
  },
  {
    nome: "Cristiano",
    cargo: "Bombeiro civil, Instrutor de Rapel e salvamento aquático",
    foto: cristiano,
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Equipe() {
  return (
    <div className="min-h-screen bg-background">
      <TopMenu />

      {/* ── Foto da equipe ── */}
      <div className="w-full overflow-hidden">
        <img
          src={equipe}
          alt="Equipe Camaleão Ecoturismo"
          className="w-full object-cover max-h-[520px] object-top"
        />
      </div>

      {/* ── Título e descrição ── */}
      <section className="px-4 py-12 md:py-16 max-w-3xl mx-auto">
        <h1 className="font-black text-4xl md:text-5xl text-[#820AD1] leading-tight mb-4">
          Nossos colaboradores.
        </h1>
        <p className="text-foreground/70 text-base md:text-lg leading-relaxed">
          Para além do conhecimento técnico, a equipe da Camaleão tem algo que não pode
          ser ensinado: paixão por aventuras na natureza. A paixão é aquilo que aquece
          ao nosso coração, move nosso corpo e restaura nossa alma. Isso é o que sentimos
          quando estamos em contato com a natureza.
        </p>
      </section>

      {/* ── Grid de cards ── */}
      <section className="bg-[#f0f0f0] px-4 py-12 pb-20">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-3 gap-5 md:gap-6">
          {MEMBERS.map((m) => (
            <div
              key={m.nome}
              className="flex flex-col rounded-2xl overflow-hidden shadow-sm bg-white"
            >
              {/* Foto */}
              <div className="w-full aspect-[3/4] overflow-hidden bg-muted">
                <img
                  src={m.foto}
                  alt={m.nome}
                  className="w-full h-full object-cover object-top"
                />
              </div>
              {/* Info */}
              <div className="px-4 py-4">
                <p className="font-bold text-[#820AD1] text-base leading-snug mb-1">
                  {m.nome}
                </p>
                <p className="text-foreground/70 text-sm leading-snug">
                  {m.cargo}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
      <FloatingContactButton />
    </div>
  );
}
