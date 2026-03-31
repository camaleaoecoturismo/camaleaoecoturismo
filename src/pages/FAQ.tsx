import { useState, useEffect, useRef } from "react";
import bannerFaq from "@/assets/banner-faq.png";
import { supabase } from "@/integrations/supabase/client";
import { TopMenu } from "@/components/TopMenu";
import Footer from "@/components/Footer";
import {
  BusFront,
  ChevronDown,
  ClipboardList,
  Leaf,
  Loader2,
  MessageCircle,
  Mountain,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import DOMPurify from "dompurify";

interface FaqItem {
  id: string;
  pergunta: string;
  resposta: string;
  categoria: string | null;
  display_order: number;
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Minha Primeira Trilha": Mountain,
  "Nível de Dificuldade e Preparação": Mountain,
  "Política de Reservas e Cancelamento": ClipboardList,
  "Transporte e Logística": BusFront,
  "Alimentação e Estrutura": UtensilsCrossed,
};

const renderCategoryIcon = (category: string, className = "w-4 h-4") => {
  const Icon = CATEGORY_ICONS[category] || Leaf;
  return <Icon className={className} aria-hidden="true" />;
};

export default function FAQ() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const contentRef = useRef<HTMLDivElement>(null);

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

  const categories = Array.from(new Set(items.map((i) => i.categoria).filter(Boolean) as string[]));

  const filtered = items.filter(
    (i) => activeCategory === "all" || i.categoria === activeCategory
  );

  const grouped: Record<string, FaqItem[]> = {};
  filtered.forEach((item) => {
    const cat = item.categoria || "Geral";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  const handleCategoryClick = (cat: string) => {
    setActiveCategory(cat);
    setOpenId(null);
    // On mobile, scroll to content
    if (window.innerWidth < 1024) {
      setTimeout(() => contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopMenu />

      {/* Hero */}
      <div className="relative w-full h-52 md:h-72 overflow-hidden">
        <img src={bannerFaq} alt="Central de Ajuda" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20 flex flex-col justify-end px-6 pb-8 md:px-12 md:pb-10">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">Central de Ajuda</p>
          <h1 className="font-bold text-4xl md:text-6xl text-white leading-none mb-2">
            Perguntas<br className="md:hidden" /> frequentes
          </h1>
          <p className="text-white/70 text-sm md:text-base max-w-md">
            Tudo que você precisa saber antes de embarcar na sua expedição.
          </p>
        </div>
      </div>

      {/* Mobile category pills */}
      <div className="lg:hidden border-b border-border bg-card sticky top-0 z-10">
        <div className="flex gap-2 overflow-x-auto px-4 py-3" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => handleCategoryClick("all")}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              activeCategory === "all"
                ? "bg-primary text-white border-primary"
                : "bg-muted text-muted-foreground border-border"
            }`}
          >
            Todas
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                activeCategory === cat
                  ? "bg-primary text-white border-primary"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                {renderCategoryIcon(cat, "w-3.5 h-3.5")}
                <span>{cat}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 lg:py-16">
        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-12 lg:items-start">

          {/* ── Desktop sidebar ── */}
          <aside className="hidden lg:block sticky top-24 self-start">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Categorias</p>
            <nav className="space-y-1">
              <button
                onClick={() => handleCategoryClick("all")}
                className={`w-full text-left flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeCategory === "all"
                    ? "bg-primary text-white shadow-sm"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <span>Todas as perguntas</span>
                <span className={`text-xs rounded-full px-2 py-0.5 font-bold ${activeCategory === "all" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                  {items.length}
                </span>
              </button>
              {categories.map((cat) => {
                const count = items.filter((i) => i.categoria === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => handleCategoryClick(cat)}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                      activeCategory === cat
                        ? "bg-primary text-white shadow-sm font-semibold"
                        : "text-foreground hover:bg-muted font-medium"
                    }`}
                  >
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5">
                      {renderCategoryIcon(cat, "w-4 h-4")}
                    </span>
                    <span className="flex-1 leading-snug">{cat}</span>
                    <span className={`text-xs rounded-full px-2 py-0.5 font-bold shrink-0 ${activeCategory === cat ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* WhatsApp CTA */}
            <div className="mt-8 p-4 rounded-2xl bg-green-50 border border-green-200">
              <p className="text-sm font-semibold text-green-800 mb-1">Não encontrou sua dúvida?</p>
              <p className="text-xs text-green-700 mb-3">Fale direto com nossa equipe pelo WhatsApp.</p>
              <a
                href="https://wa.me/5582993649454"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-xs font-bold text-green-700 hover:text-green-800 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Abrir WhatsApp
              </a>
            </div>
          </aside>

          {/* ── Content ── */}
          <div ref={contentRef}>
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-10">
                {Object.entries(grouped).map(([category, faqItems]) => (
                  <div key={category}>
                    {/* Category header */}
                    {Object.keys(grouped).length > 1 && (
                      <div className="flex items-center gap-3 mb-4">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/8 text-primary">
                          {renderCategoryIcon(category, "w-5 h-5")}
                        </span>
                        <div>
                          <h2 className="font-bold text-base text-foreground">{category}</h2>
                          <p className="text-xs text-muted-foreground">{faqItems.length} perguntas</p>
                        </div>
                      </div>
                    )}

                    {/* Accordion */}
                    <div className="space-y-2">
                      {faqItems.map((item, idx) => {
                        const isOpen = openId === item.id;
                        return (
                          <div
                            key={item.id}
                            className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                              isOpen
                                ? "border-primary/30 bg-primary/[0.03] shadow-sm"
                                : "border-border bg-card hover:border-border/80"
                            }`}
                          >
                            <button
                              onClick={() => setOpenId(isOpen ? null : item.id)}
                              className="w-full flex items-center gap-4 px-5 py-4 text-left"
                            >
                              <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                                isOpen ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                              }`}>
                                {idx + 1}
                              </span>
                              <span className={`flex-1 text-sm font-medium leading-snug transition-colors ${
                                isOpen ? "text-primary" : "text-foreground"
                              }`}>
                                {item.pergunta}
                              </span>
                              <ChevronDown
                                className={`h-4 w-4 shrink-0 transition-transform duration-300 ${
                                  isOpen ? "rotate-180 text-primary" : "text-muted-foreground"
                                }`}
                              />
                            </button>
                            {isOpen && (
                              <div
                                className="px-5 pb-5 pt-1 text-sm text-muted-foreground leading-relaxed whitespace-pre-line border-t border-primary/10 ml-[60px] prose prose-sm prose-gray dark:prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.resposta) }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Mobile WhatsApp CTA */}
            <div className="lg:hidden mt-10 p-6 rounded-2xl bg-primary/5 border border-primary/20 text-center">
              <h3 className="font-semibold text-foreground mb-1">Não encontrou o que procurava?</h3>
              <p className="text-sm text-muted-foreground mb-4">Nossa equipe responde pelo WhatsApp.</p>
              <a
                href="https://wa.me/5582993649454"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Falar no WhatsApp
              </a>
            </div>
          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
}
