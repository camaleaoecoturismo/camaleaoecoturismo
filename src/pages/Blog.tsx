import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopMenu } from "@/components/TopMenu";
import { Link, useSearchParams } from "react-router-dom";
import { Calendar, User, ArrowRight, Loader2, BookOpen, Clock, X } from "lucide-react";

interface BlogPost {
  id: string;
  titulo: string;
  slug: string;
  excerpt: string | null;
  content_html: string | null;
  cover_image: string | null;
  autor: string | null;
  published_at: string | null;
  tags: string[] | null;
}

function readingTime(html: string | null) {
  if (!html) return 1;
  const words = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

const ORIG_TITLE = document.title;
const ORIG_DESC = document.querySelector('meta[name="description"]')?.getAttribute("content") || "";

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTag = searchParams.get("tag") || "";

  useEffect(() => {
    document.title = "Blog | Camaleão Ecoturismo — Trilhas e Cachoeiras em Alagoas";
    document.querySelector('meta[name="description"]')
      ?.setAttribute("content", "Dicas de trilhas, cachoeiras, passeios em Alagoas e Chapada Diamantina. Roteiros, experiências e aventuras com a Camaleão Ecoturismo.");
    return () => {
      document.title = ORIG_TITLE;
      document.querySelector('meta[name="description"]')?.setAttribute("content", ORIG_DESC);
    };
  }, []);

  useEffect(() => {
    supabase
      .from("blog_posts")
      .select("id, titulo, slug, excerpt, content_html, cover_image, autor, published_at, tags")
      .eq("publicado", true)
      .order("published_at", { ascending: false })
      .then(({ data }) => {
        if (data) setPosts(data as BlogPost[]);
        setLoading(false);
      });
  }, []);

  // All unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    posts.forEach(p => p.tags?.forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [posts]);

  // Filtered posts
  const filtered = useMemo(() => {
    if (!activeTag) return posts;
    return posts.filter(p => p.tags?.includes(activeTag));
  }, [posts, activeTag]);

  const featured = filtered[0] ?? null;
  const rest = filtered.slice(1);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      <TopMenu />

      {/* Hero clean */}
      <section className="border-b border-border bg-background py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Conteúdo</p>
          <h1 className="font-bold text-5xl md:text-6xl text-foreground leading-none mb-3">Blog</h1>
          <p className="text-muted-foreground text-lg">
            Trilhas, cachoeiras e aventuras em Alagoas — dicas, roteiros e histórias
          </p>
        </div>
      </section>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <section className="border-b border-border bg-muted/30 px-4 py-3">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSearchParams({})}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                !activeTag ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Todos
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSearchParams({ tag })}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeTag === tag ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                #{tag}
              </button>
            ))}
            {activeTag && (
              <button onClick={() => setSearchParams({})} className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-3 w-3" /> Limpar filtro
              </button>
            )}
          </div>
        </section>
      )}

      {/* Posts */}
      <section className="py-10 px-4">
        <div className="max-w-5xl mx-auto">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {activeTag ? `Nenhum post com #${activeTag}` : "Em breve"}
              </h2>
              <p className="text-muted-foreground">
                {activeTag ? "Tente outro filtro." : "Estamos preparando conteúdo incrível para você!"}
              </p>
            </div>
          ) : (
            <div className="space-y-10">

              {/* Featured post */}
              {featured && (
                <Link
                  to={`/blog/${featured.slug}`}
                  className="group grid md:grid-cols-5 gap-0 rounded-2xl border border-border overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all"
                >
                  {/* Image */}
                  <div className="md:col-span-3 overflow-hidden bg-muted">
                    {featured.cover_image ? (
                      <img
                        src={featured.cover_image}
                        alt={featured.titulo}
                        className="w-full h-full object-cover aspect-[16/9] md:aspect-auto group-hover:scale-105 transition-transform duration-500"
                        style={{ minHeight: 240 }}
                      />
                    ) : (
                      <div className="w-full h-full min-h-[240px] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <BookOpen className="h-14 w-14 text-primary/20" />
                      </div>
                    )}
                  </div>
                  {/* Text */}
                  <div className="md:col-span-2 p-6 md:p-8 flex flex-col justify-between">
                    <div>
                      <span className="inline-block bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider mb-3">
                        Destaque
                      </span>
                      <h2 className="font-bold text-xl md:text-2xl text-foreground leading-snug mb-3 group-hover:text-primary transition-colors">
                        {featured.titulo}
                      </h2>
                      {featured.excerpt && (
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-4">
                          {featured.excerpt}
                        </p>
                      )}
                      {featured.tags && featured.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {featured.tags.slice(0, 4).map(tag => (
                            <span key={tag} className="bg-primary/10 text-primary text-[10px] font-medium px-2 py-0.5 rounded-full">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        {featured.autor && (
                          <span className="flex items-center gap-1"><User className="h-3 w-3" />{featured.autor}</span>
                        )}
                        {featured.published_at && (
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(featured.published_at)}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />{readingTime(featured.content_html)} min
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              )}

              {/* Grid */}
              {rest.length > 0 && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {rest.map((post) => (
                    <Link
                      key={post.id}
                      to={`/blog/${post.slug}`}
                      className="group bg-card rounded-xl border border-border overflow-hidden hover:shadow-md hover:border-primary/30 transition-all flex flex-col"
                    >
                      {post.cover_image ? (
                        <img
                          src={post.cover_image}
                          alt={post.titulo}
                          className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <BookOpen className="h-8 w-8 text-primary/20" />
                        </div>
                      )}
                      <div className="p-4 flex flex-col flex-1">
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {post.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="bg-primary/10 text-primary text-[10px] font-medium px-2 py-0.5 rounded-full">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <h2 className="font-semibold text-foreground text-sm leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2 flex-1">
                          {post.titulo}
                        </h2>
                        {post.excerpt && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                            {post.excerpt}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
                          <div className="flex items-center gap-2">
                            {post.published_at && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />{formatDate(post.published_at)}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />{readingTime(post.content_html)} min
                            </span>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-primary group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <footer className="py-8 px-4 text-center text-xs text-muted-foreground border-t border-border mt-8">
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
