import { useState, useEffect } from "react";
import bannerPoliticas from "@/assets/banner-politicas.png";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TopMenu } from "@/components/TopMenu";
import { Loader2 } from "lucide-react";
import DOMPurify from "dompurify";

export default function Politicas() {
  const [searchParams] = useSearchParams();
  const tipo = searchParams.get("tipo") || "cancelamento";
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("policies")
      .select("content_html, updated_at")
      .eq("tipo", tipo)
      .single()
      .then(({ data }) => {
        if (data) {
          setContent(data.content_html);
          setUpdatedAt(data.updated_at);
        }
        setLoading(false);
      });
  }, [tipo]);

  const title = tipo === "cancelamento" ? "Política de Cancelamento" : "Termos de Uso";

  return (
    <div className="min-h-screen bg-background">
      <TopMenu />

      {/* Hero banner */}
      <div className="relative w-full h-48 md:h-64 overflow-hidden">
        <img src={bannerPoliticas} alt="Políticas" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/45 flex flex-col justify-end px-6 pb-6 md:px-10 md:pb-8">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Legal</p>
          <h1 className="font-bold text-4xl md:text-5xl text-white leading-none">{title.toUpperCase()}</h1>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex gap-0">
            {[
              { value: "cancelamento", label: "Política de Cancelamento" },
              { value: "termos", label: "Termos de Uso" },
            ].map((tab) => (
              <Link
                key={tab.value}
                to={`/politicas?tipo=${tab.value}`}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tipo === tab.value
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-10">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : content ? (
          <>
            <div
              className="prose prose-gray dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
            />
            {updatedAt && (
              <p className="text-xs text-muted-foreground mt-10 pt-6 border-t border-border">
                Última atualização:{" "}
                {new Date(updatedAt).toLocaleDateString("pt-BR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
          </>
        ) : (
          <p className="text-muted-foreground">Conteúdo não disponível.</p>
        )}
      </div>

      <footer className="py-8 px-4 text-center text-xs text-muted-foreground border-t border-border">
        <p>© {new Date().getFullYear()} Camaleão Ecoturismo</p>
        <div className="flex justify-center gap-4 mt-2">
          <Link to="/" className="hover:text-foreground transition-colors">Expedições</Link>
          <Link to="/sobre" className="hover:text-foreground transition-colors">Sobre nós</Link>
          <Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
        </div>
      </footer>
    </div>
  );
}
