import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TopMenu } from "@/components/TopMenu";
import Footer from "@/components/Footer";
import { FloatingContactButton } from "@/components/FloatingContactButton";
import { Loader2 } from "lucide-react";

interface TeamMember {
  id: string;
  nome: string;
  cargo: string;
  bio: string | null;
  foto_url: string | null;
  display_order: number;
}

export default function Equipe() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Nossa Equipe — Camaleão Ecoturismo";
    supabase
      .from("team_members")
      .select("id, nome, cargo, bio, foto_url, display_order")
      .order("display_order")
      .then(({ data }) => {
        if (data) setMembers(data);
        setLoading(false);
      });
    return () => { document.title = "Camaleão Ecoturismo"; };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <TopMenu />

      {/* Header */}
      <section className="pt-28 pb-12 px-4 text-center">
        <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-2">Quem somos</p>
        <h1 className="font-figtree text-4xl md:text-5xl font-bold text-foreground uppercase tracking-tight">
          Nossa Equipe
        </h1>
        <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
          Apaixonados pela natureza e dedicados a criar experiências únicas para você.
        </p>
      </section>

      {/* Team grid */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : members.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">Em breve.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8">
            {members.map((m) => (
              <div key={m.id} className="flex flex-col items-center text-center">
                {m.foto_url ? (
                  <img
                    src={m.foto_url}
                    alt={m.nome}
                    className="w-28 h-28 rounded-full object-cover mb-4 ring-4 ring-primary/10 shadow-md"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary font-bold text-3xl shadow-md">
                    {m.nome[0]}
                  </div>
                )}
                <p className="font-semibold text-foreground text-sm leading-snug">{m.nome}</p>
                <p className="text-primary text-xs mt-0.5">{m.cargo}</p>
                {m.bio && (
                  <p className="text-muted-foreground text-xs mt-2 leading-relaxed line-clamp-4">{m.bio}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <Footer />
      <FloatingContactButton />
    </div>
  );
}
