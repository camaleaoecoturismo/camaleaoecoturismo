import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TopMenu } from "@/components/TopMenu";
import { ArrowLeft, Calendar, User, Loader2, Clock, Share2, BookOpen, ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import DOMPurify from "dompurify";

interface Post {
  id: string;
  titulo: string;
  slug: string;
  content_html: string | null;
  excerpt: string | null;
  cover_image: string | null;
  autor: string | null;
  autor_foto: string | null;
  published_at: string | null;
  meta_description: string | null;
  tags: string[] | null;
}

// ── Sanitize HTML allowing YouTube/Vimeo iframes + gallery data attr ─────────
function sanitizeBlogHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'src', 'class', 'data-images', 'contenteditable', 'style'],
    ALLOW_DATA_ATTR: true,
    FORBID_ATTR: [],
  });
}

// Apply the hook once (module-level, idempotent)
let _hookAdded = false;
if (!_hookAdded) {
  DOMPurify.addHook('uponSanitizeElement', (node, data) => {
    if (data.tagName === 'iframe') {
      const src = (node as Element).getAttribute('src') || '';
      if (
        !src.startsWith('https://www.youtube.com/embed/') &&
        !src.startsWith('https://player.vimeo.com/video/')
      ) {
        (node as Element).remove();
      }
    }
  });
  _hookAdded = true;
}

// ── Content segment types ─────────────────────────────────────────────────────
type Segment =
  | { type: 'html'; html: string }
  | { type: 'gallery'; images: string[] };

// Gallery is stored as <div class="ql-gallery" data-images="url1|url2|url3">
// by the custom Quill GalleryBlot. Detection is simple and unambiguous.
function parseSegments(html: string): Segment[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;
  const segments: Segment[] = [];

  for (const node of Array.from(body.childNodes)) {
    const el = node as Element;
    const dataImages = el.nodeType === Node.ELEMENT_NODE
      ? el.getAttribute?.('data-images')
      : null;

    if (dataImages) {
      const images = dataImages.split('|').filter(Boolean);
      if (images.length >= 1) {
        segments.push({ type: 'gallery', images });
        continue;
      }
    }

    const outerHtml = el.outerHTML ?? node.textContent ?? '';
    if (segments.length > 0 && segments[segments.length - 1].type === 'html') {
      (segments[segments.length - 1] as { type: 'html'; html: string }).html += outerHtml;
    } else {
      segments.push({ type: 'html', html: outerHtml });
    }
  }

  return segments;
}

// ── Gallery carousel ──────────────────────────────────────────────────────────
function BlogGallery({ images }: { images: string[] }) {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [modalApi, setModalApi] = useState<CarouselApi>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const syncCurrentIndex = useCallback(() => {
    if (!carouselApi) return;
    setCurrentIndex(carouselApi.selectedScrollSnap());
  }, [carouselApi]);

  const syncLightboxIndex = useCallback(() => {
    if (!modalApi) return;
    setLightboxIndex(modalApi.selectedScrollSnap());
  }, [modalApi]);

  useEffect(() => {
    if (!carouselApi) return;
    syncCurrentIndex();
    carouselApi.on("select", syncCurrentIndex);
    carouselApi.on("reInit", syncCurrentIndex);
    return () => {
      carouselApi.off("select", syncCurrentIndex);
      carouselApi.off("reInit", syncCurrentIndex);
    };
  }, [carouselApi, syncCurrentIndex]);

  useEffect(() => {
    if (!modalApi) return;
    syncLightboxIndex();
    modalApi.on("select", syncLightboxIndex);
    modalApi.on("reInit", syncLightboxIndex);
    return () => {
      modalApi.off("select", syncLightboxIndex);
      modalApi.off("reInit", syncLightboxIndex);
    };
  }, [modalApi, syncLightboxIndex]);

  useEffect(() => {
    if (!lightboxOpen || !modalApi) return;
    modalApi.scrollTo(lightboxIndex, true);
  }, [lightboxOpen, lightboxIndex, modalApi]);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      <div className="my-8 not-prose">
        <Carousel
          setApi={setCarouselApi}
          opts={{ loop: images.length > 1 }}
          className="group"
        >
          <CarouselContent className="ml-0">
            {images.map((src, i) => (
              <CarouselItem key={src + i} className="pl-0 basis-full">
                <button
                  type="button"
                  onClick={() => openLightbox(i)}
                  className="relative block w-full overflow-hidden rounded-2xl bg-muted text-left"
                  aria-label={`Abrir foto ${i + 1} da galeria`}
                >
                  <img
                    src={src}
                    alt={`Imagem ${i + 1} da galeria`}
                    className="h-[260px] w-full object-cover sm:h-[360px] lg:h-[460px]"
                    draggable={false}
                  />
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>

          {images.length > 1 && (
            <>
              <CarouselPrevious className="left-3 h-10 w-10 border-0 bg-black/55 text-white hover:bg-black/75 disabled:opacity-0" />
              <CarouselNext className="right-3 h-10 w-10 border-0 bg-black/55 text-white hover:bg-black/75 disabled:opacity-0" />

              <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
                {currentIndex + 1}/{images.length}
              </div>

              <div className="mt-3 flex justify-center gap-2">
                {images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => carouselApi?.scrollTo(i)}
                    className={`h-2 rounded-full transition-all ${i === currentIndex ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60"}`}
                    aria-label={`Ir para foto ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </Carousel>
      </div>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="h-auto w-auto max-h-[95vh] max-w-[95vw] overflow-hidden border-0 bg-black/95 p-0">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 z-50 text-white hover:bg-white/10"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>

          <div className="flex flex-col overflow-hidden pt-10">
            <Carousel
              setApi={setModalApi}
              opts={{ startIndex: lightboxIndex, loop: images.length > 1 }}
              className="w-full"
            >
              <CarouselContent className="ml-0">
                {images.map((src, i) => (
                  <CarouselItem key={`lightbox-${src}-${i}`} className="flex basis-full items-center justify-center pl-0">
                    <div className="flex w-full items-center justify-center px-4 pb-4">
                      <img
                        src={src}
                        alt={`Imagem ${i + 1} da galeria ampliada`}
                        className="max-h-[80vh] max-w-full rounded-xl object-contain"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>

              {images.length > 1 && (
                <>
                  <CarouselPrevious className="left-2 border-0 bg-white/10 text-white hover:bg-white/20" />
                  <CarouselNext className="right-2 border-0 bg-white/10 text-white hover:bg-white/20" />
                </>
              )}
            </Carousel>

            {images.length > 1 && (
              <div className="pb-5 text-center text-sm text-white/70">
                {lightboxIndex + 1} / {images.length}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Rendered content ──────────────────────────────────────────────────────────
function BlogContent({ html }: { html: string }) {
  const sanitized = sanitizeBlogHtml(html);
  const segments = parseSegments(sanitized);

  return (
    <>
      {segments.map((seg, i) =>
        seg.type === 'gallery' ? (
          <BlogGallery key={i} images={seg.images} />
        ) : (
          <div
            key={i}
            className="prose prose-lg prose-gray max-w-none [&_.blog-video-wrapper]:relative [&_.blog-video-wrapper]:pb-[56.25%] [&_.blog-video-wrapper]:h-0 [&_.blog-video-wrapper]:my-6 [&_.blog-video-wrapper_iframe]:absolute [&_.blog-video-wrapper_iframe]:inset-0 [&_.blog-video-wrapper_iframe]:w-full [&_.blog-video-wrapper_iframe]:h-full [&_.blog-video-wrapper_iframe]:rounded-xl"
            dangerouslySetInnerHTML={{ __html: seg.html }}
          />
        )
      )}
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function readingTime(html: string | null) {
  if (!html) return 1;
  const words = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

const ORIG_TITLE = document.title;
const ORIG_DESC = document.querySelector('meta[name="description"]')?.getAttribute("content") || "";
const ORIG_OG_TITLE = document.querySelector('meta[property="og:title"]')?.getAttribute("content") || "";
const ORIG_OG_DESC = document.querySelector('meta[property="og:description"]')?.getAttribute("content") || "";
const ORIG_OG_IMAGE = document.querySelector('meta[property="og:image"]')?.getAttribute("content") || "";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [related, setRelated] = useState<Post[]>([]);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("publicado", true)
      .single()
      .then(async ({ data, error }) => {
        if (error || !data) { setNotFound(true); setLoading(false); return; }
        setPost(data as Post);

        const { data: rel } = await supabase
          .from("blog_posts")
          .select("id, titulo, slug, cover_image, published_at, excerpt, tags, meta_description, content_html, autor, autor_foto")
          .eq("publicado", true)
          .neq("slug", slug)
          .order("published_at", { ascending: false })
          .limit(3);
        if (rel) setRelated(rel as Post[]);
        setLoading(false);
      });
  }, [slug]);

  // Dynamic SEO
  useEffect(() => {
    if (!post) return;
    const desc = post.meta_description || post.excerpt || "";
    document.title = `${post.titulo} | Camaleão Ecoturismo`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", desc);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", post.titulo);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", desc);
    document.querySelector('meta[property="og:image"]')?.setAttribute("content", post.cover_image || "");
    document.querySelector('meta[property="og:url"]')?.setAttribute("content", window.location.href);

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.href;

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "blog-post-jsonld";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.titulo,
      description: desc,
      image: post.cover_image || undefined,
      author: { "@type": "Person", name: post.autor || "Camaleão Ecoturismo" },
      publisher: { "@type": "Organization", name: "Camaleão Ecoturismo", url: "https://www.camaleaoecoturismo.com.br" },
      datePublished: post.published_at || undefined,
      url: window.location.href,
    });
    document.head.appendChild(script);

    return () => {
      document.title = ORIG_TITLE;
      document.querySelector('meta[name="description"]')?.setAttribute("content", ORIG_DESC);
      document.querySelector('meta[property="og:title"]')?.setAttribute("content", ORIG_OG_TITLE);
      document.querySelector('meta[property="og:description"]')?.setAttribute("content", ORIG_OG_DESC);
      document.querySelector('meta[property="og:image"]')?.setAttribute("content", ORIG_OG_IMAGE);
      document.getElementById("blog-post-jsonld")?.remove();
      document.querySelector('link[rel="canonical"]')?.remove();
    };
  }, [post]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

  const handleShare = async () => {
    const shareData = { title: post?.titulo || "", url: window.location.href };
    if (navigator.share && navigator.canShare?.(shareData)) {
      try { await navigator.share(shareData); } catch {}
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => alert("Link copiado!"));
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background">
      <TopMenu />
      <div className="flex justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    </div>
  );

  if (notFound || !post) return (
    <div className="min-h-screen bg-background">
      <TopMenu />
      <div className="max-w-2xl mx-auto px-4 py-32 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">Post não encontrado</h1>
        <Link to="/blog" className="text-primary hover:underline">← Voltar ao Blog</Link>
      </div>
    </div>
  );

  const minutes = readingTime(post.content_html);

  return (
    <div className="min-h-screen bg-background">
      <TopMenu />

      {/* Hero */}
      {post.cover_image ? (
        <div className="relative w-full overflow-hidden" style={{ minHeight: 260 }}>
          <img
            src={post.cover_image}
            alt={post.titulo}
            className="w-full object-cover"
            style={{ aspectRatio: "4/3", maxHeight: 520 }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-6 pt-16 md:px-10 md:pb-10 max-w-3xl mx-auto">
            <Link to="/blog" className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm mb-3 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Blog
            </Link>
            <h1 className="text-2xl md:text-4xl font-bold text-white leading-snug drop-shadow-md">{post.titulo}</h1>
          </div>
        </div>
      ) : (
        <div className="bg-muted/30 border-b border-border py-12 px-4">
          <div className="max-w-3xl mx-auto">
            <Link to="/blog" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-4 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Blog
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">{post.titulo}</h1>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Meta */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-6 border-b border-border">
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {post.autor && (
              <span className="flex items-center gap-2">
                {post.autor_foto ? (
                  <img src={post.autor_foto} alt={post.autor} className="w-7 h-7 rounded-full object-cover border border-border" />
                ) : (
                  <User className="h-4 w-4" />
                )}
                {post.autor}
              </span>
            )}
            {post.published_at && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" /> {formatDate(post.published_at)}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> {minutes} min de leitura
            </span>
          </div>
          <button onClick={handleShare} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Share2 className="h-4 w-4" /> Compartilhar
          </button>
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {post.tags.map(tag => (
              <Link key={tag} to={`/blog?tag=${encodeURIComponent(tag)}`} className="bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full hover:bg-primary/20 transition-colors">
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {/* Conteúdo */}
        {post.content_html ? (
          <BlogContent html={post.content_html} />
        ) : (
          <p className="text-muted-foreground">Conteúdo não disponível.</p>
        )}

        {/* CTA */}
        <div className="mt-12 p-6 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-foreground">Pronto para a aventura?</p>
            <p className="text-sm text-muted-foreground mt-0.5">Veja os próximos passeios disponíveis</p>
          </div>
          <Link to="/" className="shrink-0 flex items-center gap-1.5 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
            Ver expedições <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Posts relacionados */}
        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="text-base font-semibold text-foreground mb-4">Leia também</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {related.map(r => (
                <Link key={r.id} to={`/blog/${r.slug}`} className="group rounded-xl border border-border overflow-hidden hover:border-primary/30 hover:shadow-md transition-all">
                  {r.cover_image ? (
                    <img src={r.cover_image} alt={r.titulo} className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full aspect-video bg-muted flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">{r.titulo}</p>
                    {r.published_at && <p className="text-xs text-muted-foreground mt-1">{formatDate(r.published_at)}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Voltar */}
        <div className="mt-10 pt-8 border-t border-border">
          <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Ver todos os posts
          </Link>
        </div>
      </div>
    </div>
  );
}
