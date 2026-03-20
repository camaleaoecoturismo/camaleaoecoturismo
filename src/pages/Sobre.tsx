import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopMenu } from "@/components/TopMenu";
import { Link } from "react-router-dom";
import { MapPin, Heart, Mountain, Users, Instagram, Phone } from "lucide-react";

interface TeamMember {
  id: string;
  nome: string;
  cargo: string;
  bio: string | null;
  foto_url: string | null;
  display_order: number;
}

export default function Sobre() {
  const [team, setTeam] = useState<TeamMember[]>([]);

  useEffect(() => {
    supabase
      .from("team_members")
      .select("*")
      .order("display_order")
      .then(({ data }) => { if (data) setTeam(data); });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <TopMenu />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-primary-foreground/70 text-sm font-semibold uppercase tracking-widest mb-3">
            Nossa História
          </p>
          <h1 className="font-display text-5xl md:text-7xl mb-6 leading-none">
            CAMALEÃO ECOTURISMO
          </h1>
          <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto leading-relaxed">
            Conectamos pessoas à natureza através de aventuras inesquecíveis na Chapada Diamantina e destinos únicos do Brasil.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Mountain,
              title: "Nossa Missão",
              text: "Proporcionar experiências de ecoturismo transformadoras, aliando aventura, cultura e preservação ambiental.",
            },
            {
              icon: Heart,
              title: "Nossos Valores",
              text: "Segurança, respeito à natureza, valorização das comunidades locais e experiências autênticas para cada viajante.",
            },
            {
              icon: Users,
              title: "Nossa Comunidade",
              text: "Mais de 800 aventureiros que já confiaram em nós para explorar cachoeiras, trilhas e paisagens de tirar o fôlego.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="text-center p-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground text-lg mb-2">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="bg-muted/30 py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-4xl text-foreground mb-6">QUEM SOMOS</h2>
          <div className="prose prose-gray dark:prose-invert max-w-none space-y-4 text-muted-foreground leading-relaxed">
            <p>
              A Camaleão Ecoturismo nasceu da paixão pela natureza e pela vontade de compartilhar a beleza dos destinos do Brasil com quem busca aventura de verdade. Fundada em Lençóis, coração da Chapada Diamantina, nossa agência conecta pessoas a experiências únicas que vão muito além do turismo convencional.
            </p>
            <p>
              Cada expedição é cuidadosamente planejada com guias experientes, roteiros seguros e um olhar atento à preservação dos ecossistemas que visitamos. Acreditamos que o turismo responsável é o caminho para garantir que as próximas gerações também possam se maravilhar com esses destinos.
            </p>
            <p>
              Seja em cachoeiras escondidas, trilhas desafiadoras, rapel em paredões ou mergulho nas piscinas naturais — cada aventura com a Camaleão é uma experiência que fica marcada para sempre.
            </p>
          </div>
        </div>
      </section>

      {/* Team */}
      {team.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="font-display text-4xl text-foreground">NOSSA EQUIPE</h2>
              <p className="text-muted-foreground mt-2">As pessoas por trás das aventuras</p>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
              {team.map((member) => (
                <div key={member.id} className="text-center bg-card rounded-xl border border-border p-6">
                  {member.foto_url ? (
                    <img
                      src={member.foto_url}
                      alt={member.nome}
                      className="w-20 h-20 rounded-full object-cover mx-auto mb-4"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-bold text-primary">{member.nome[0]}</span>
                    </div>
                  )}
                  <h3 className="font-semibold text-foreground">{member.nome}</h3>
                  <p className="text-sm text-primary font-medium mt-0.5">{member.cargo}</p>
                  {member.bio && (
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{member.bio}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-primary text-primary-foreground py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-4xl mb-4">PRONTO PARA AVENTURAR?</h2>
          <p className="text-primary-foreground/80 mb-8">
            Veja nossa agenda de passeios e reserve a sua próxima expedição.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-white text-primary font-semibold px-6 py-3 rounded-xl hover:bg-white/90 transition-colors"
            >
              <Mountain className="h-4 w-4" />
              Ver Expedições
            </Link>
            <a
              href="https://wa.me/5582993649454"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 border border-white/50 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition-colors"
            >
              <Phone className="h-4 w-4" />
              Fale Conosco
            </a>
          </div>
        </div>
      </section>

      {/* Footer minimal */}
      <footer className="py-8 px-4 text-center text-xs text-muted-foreground border-t border-border">
        <p>© {new Date().getFullYear()} Camaleão Ecoturismo · Lençóis, BA</p>
        <div className="flex justify-center gap-4 mt-2">
          <Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
          <Link to="/politicas?tipo=cancelamento" className="hover:text-foreground transition-colors">Cancelamento</Link>
          <Link to="/politicas?tipo=termos" className="hover:text-foreground transition-colors">Termos</Link>
        </div>
      </footer>
    </div>
  );
}
