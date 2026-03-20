import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TopMenu } from "@/components/TopMenu";
import { ArrowLeft, Calendar, User, Loader2 } from "lucide-react";
import DOMPurify from "dompurify";

interface Post {
  id: string;
  titulo: string;
  slug: string;
  content_html: string | null;
  excerpt: string | null;
  cover_image: string | null;
  autor: string | null;
  published_at: string | null;
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("publicado", true)
      .single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true);
        else setPost(data);
        setLoading(false);
      });
  }, [slug]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopMenu />
        <div className="flex justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-background">
        <TopMenu />
        <div className="max-w-2xl mx-auto px-4 py-32 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Post não encontrado</h1>
          <Link to="/blog" className="text-primary hover:underline">← Voltar ao Blog</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopMenu />

      {/* Cover */}
      {post.cover_image && (
        <div className="w-full aspect-[21/9] overflow-hidden max-h-80">
          <img
            src={post.cover_image}
            alt={post.titulo}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Back */}
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Blog
        </Link>

        {/* Header */}
        <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-4">
          {post.titulo}
        </h1>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-10 pb-6 border-b border-border">
          {post.autor && (
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              {post.autor}
            </span>
          )}
          {post.published_at && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDate(post.published_at)}
            </span>
          )}
        </div>

        {/* Content */}
        {post.content_html ? (
          <div
            className="prose prose-gray dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(post.content_html),
            }}
          />
        ) : (
          <p className="text-muted-foreground">Conteúdo não disponível.</p>
        )}

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-border">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Ver todos os posts
          </Link>
        </div>
      </div>
    </div>
  );
}
