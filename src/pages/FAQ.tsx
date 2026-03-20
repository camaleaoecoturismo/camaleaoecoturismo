import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopMenu } from "@/components/TopMenu";
import { Link } from "react-router-dom";
import { ChevronDown, HelpCircle, Loader2 } from "lucide-react";

interface FaqItem {
  id: string;
  pergunta: string;
  resposta: string;
  categoria: string | null;
  display_order: number;
}

export default function FAQ() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    supabase
      .from("faq_items")
      .select("*")
      .order("display_order")
      .then(({ data }) => {
        if (data) setItems(data);
        setLoading(false);
      });
  }, []);

  const categories = ["all", ...Array.from(new Set(items.map((i) => i.categoria).filter(Boolean) as string[]))];

  const filtered = items.filter(
    (i) => activeCategory === "all" || i.categoria === activeCategory
  );

  // Group by category
  const grouped: Record<string, FaqItem[]> = {};
  filtered.forEach((item) => {
    const cat = item.categoria || "Geral";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  return (
    <div className="min-h-screen bg-background">
      <TopMenu />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-primary-foreground/70 text-sm font-semibold uppercase tracking-widest mb-3">
            Dúvidas frequentes
          </p>
          <h1 className="font-display text-5xl md:text-7xl leading-none mb-4">FAQ</h1>
          <p className="text-primary-foreground/80 text-lg">
            Encontre respostas para as perguntas mais comuns sobre nossas expedições
          </p>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Category filter */}
          {categories.length > 2 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    activeCategory === cat
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {cat === "all" ? "Todas" : cat}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20">
              <HelpCircle className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">FAQ em breve</h2>
              <p className="text-muted-foreground">
                Estamos preparando as respostas mais importantes para você.
              </p>
              <a
                href="https://wa.me/5582993649454"
                className="inline-flex items-center gap-2 mt-6 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Fale diretamente conosco
              </a>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(grouped).map(([category, faqItems]) => (
                <div key={category}>
                  {Object.keys(grouped).length > 1 && (
                    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                      {category}
                    </h2>
                  )}
                  <div className="space-y-2">
                    {faqItems.map((item) => (
                      <div
                        key={item.id}
                        className="border border-border rounded-xl overflow-hidden bg-card"
                      >
                        <button
                          onClick={() => setOpenId(openId === item.id ? null : item.id)}
                          className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-muted/50 transition-colors"
                        >
                          <span className="font-medium text-foreground text-sm leading-snug">
                            {item.pergunta}
                          </span>
                          <ChevronDown
                            className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                              openId === item.id ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        {openId === item.id && (
                          <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-3">
                            {item.resposta}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Still have questions */}
          <div className="mt-12 text-center p-8 rounded-2xl bg-primary/5 border border-primary/20">
            <h3 className="font-semibold text-foreground mb-2">Não encontrou o que procurava?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Nossa equipe está pronta para responder suas dúvidas pelo WhatsApp.
            </p>
            <a
              href="https://wa.me/5582993649454"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </section>

      <footer className="py-8 px-4 text-center text-xs text-muted-foreground border-t border-border">
        <p>© {new Date().getFullYear()} Camaleão Ecoturismo</p>
        <div className="flex justify-center gap-4 mt-2">
          <Link to="/" className="hover:text-foreground transition-colors">Expedições</Link>
          <Link to="/sobre" className="hover:text-foreground transition-colors">Sobre nós</Link>
          <Link to="/politicas?tipo=cancelamento" className="hover:text-foreground transition-colors">Cancelamento</Link>
        </div>
      </footer>
    </div>
  );
}
