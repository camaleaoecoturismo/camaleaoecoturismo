import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopMenu } from "@/components/TopMenu";
import { Link } from "react-router-dom";
import { Calendar, User, ArrowRight, Loader2, BookOpen } from "lucide-react";

interface BlogPost {
  id: string;
  titulo: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  autor: string | null;
  published_at: string | null;
}

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("blog_posts")
      .select("id, titulo, slug, excerpt, cover_image, autor, published_at")
      .eq("publicado", true)
      .order("published_at", { ascending: false })
      .then(({ data }) => {
        if (data) setPosts(data);
        setLoading(false);
      });
  }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      <TopMenu />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-primary-foreground/70 text-sm font-semibold uppercase tracking-widest mb-3">
            Conteúdo
          </p>
          <h1 className="font-display text-5xl md:text-7xl leading-none mb-4">BLOG</h1>
          <p className="text-primary-foreground/80 text-lg">
            Dicas, histórias e inspiração para suas próximas aventuras
          </p>
        </div>
      </section>

      {/* Posts */}
      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Em breve</h2>
              <p className="text-muted-foreground">
                Estamos preparando conteúdo incrível para você. Volte em breve!
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className="group bg-card rounded-xl border border-border overflow-hidden hover:shadow-md hover:border-primary/30 transition-all"
                >
                  {post.cover_image ? (
                    <img
                      src={post.cover_image}
                      alt={post.titulo}
                      className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <BookOpen className="h-10 w-10 text-primary/30" />
                    </div>
                  )}
                  <div className="p-5">
                    <h2 className="font-semibold text-foreground text-base leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
                      {post.titulo}
                    </h2>
                    {post.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        {post.autor && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {post.autor}
                          </span>
                        )}
                        {post.published_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(post.published_at)}
                          </span>
                        )}
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-primary group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

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
