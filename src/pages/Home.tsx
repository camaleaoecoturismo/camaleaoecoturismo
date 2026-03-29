import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TopMenu } from "@/components/TopMenu";
import { HeroBanner } from "@/components/HeroBanner";
import Footer from "@/components/Footer";
import { TourCard } from "@/components/TourCard";
import { FloatingContactButton } from "@/components/FloatingContactButton";
import { useTours } from "@/hooks/useTours";
import { useTourCoverImages } from "@/hooks/useTourCoverImages";
import {
  Star, ChevronLeft, ChevronRight, ArrowRight, Waves, TreePine, Loader2, CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Stats ────────────────────────────────────────────────────────────────────

const STATS = [
  { target: 6,     suffix: "",   prefix: "",  label: "anos de operação" },
  { target: 5000,  suffix: "",   prefix: "+", label: "viajantes atendidos", format: (n: number) => n >= 1000 ? `+${(n/1000).toFixed(n % 1000 === 0 ? 0 : 1).replace(".", ",")}mil` : `+${n}` },
  { target: 25,    suffix: "",   prefix: "+", label: "roteiros únicos" },
  { target: 60000, suffix: "",   prefix: "+", label: "fotos registradas", format: (n: number) => n >= 1000 ? `+${Math.round(n/1000)}mil` : `+${n}` },
];

function StatsSection() {
  const ref = useRef<HTMLElement>(null);
  const [counts, setCounts] = useState([0, 0, 0, 0]);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !triggered) { setTriggered(true); } },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [triggered]);

  useEffect(() => {
    if (!triggered) return;
    const duration = 1400;
    const steps = 60;
    const interval = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const ease = 1 - Math.pow(1 - progress, 3);
      setCounts(STATS.map(s => Math.round(s.target * ease)));
      if (step >= steps) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, [triggered]);

  const format = (i: number, n: number) => {
    const s = STATS[i];
    if (s.format) return s.format(n);
    return `${s.prefix}${n.toLocaleString("pt-BR")}${s.suffix}`;
  };

  return (
    <section ref={ref} className="border-y border-border/60 bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4">
        {STATS.map((s, i) => (
          <div key={s.label} className={`flex flex-col items-center text-center py-6 px-4 border-border/50 ${i % 2 === 0 && i < 3 ? "border-r" : ""} ${i % 2 !== 0 && i < 3 ? "md:border-r" : ""}`}>
            <span className="font-figtree text-4xl md:text-5xl font-bold text-[#820AD1] leading-none tabular-nums">
              {format(i, counts[i])}
            </span>
            <span className="text-xs text-muted-foreground mt-2 uppercase tracking-widest leading-tight">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Testimonial {
  id: string;
  name: string;
  photo_url: string | null;
  text: string;
  rating: number;
  date: string | null;
}

interface Partner {
  id: string;
  name: string;
  logo_url: string;
  website_url: string | null;
}

interface TeamMember {
  id: string;
  nome: string;
  cargo: string;
  bio: string | null;
  foto_url: string | null;
}

interface BlogPost {
  id: string;
  titulo: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  published_at: string | null;
  tags: string[] | null;
}

// ─── Componente principal ──────────────────────────────────────────────────────

export default function Home() {
  const navigate = useNavigate();
  const { tours, loading: toursLoading } = useTours();

  const [heroImage, setHeroImage] = useState<string>("");
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const testimonialTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    document.title = "Camaleão Ecoturismo — Trilhas, Cachoeiras e Aventuras em Alagoas";
    document.querySelector('meta[name="description"]')?.setAttribute(
      "content",
      "Ecoturismo de verdade. Trilhas, cachoeiras e aventuras inesquecíveis em Alagoas, Chapada Diamantina e região. 6 anos, +5.000 viajantes."
    );

    supabase.from("banners").select("image_url").eq("is_active", true).order("display_order").limit(1).maybeSingle()
      .then(({ data }) => { if (data?.image_url) setHeroImage(data.image_url); });

    supabase.from("testimonials" as any).select("id, name, photo_url, text, rating, date").eq("active", true).order("display_order")
      .then(({ data }) => { if (data) setTestimonials(data as Testimonial[]); });

    supabase.from("partner_organizations" as any).select("id, name, logo_url, website_url").eq("active", true).order("display_order")
      .then(({ data }) => { if (data) setPartners(data as Partner[]); });

    supabase.from("team_members").select("id, nome, cargo, bio, foto_url").order("display_order").limit(4)
      .then(({ data }) => { if (data) setTeam(data); });

    supabase.from("blog_posts").select("id, titulo, slug, excerpt, cover_image, published_at, tags").eq("publicado", true).order("published_at", { ascending: false }).limit(3)
      .then(({ data }) => { if (data) setBlogPosts(data); });

    return () => { document.title = "Camaleão Ecoturismo"; };
  }, []);

  useEffect(() => {
    if (testimonials.length < 2) return;
    testimonialTimer.current = setInterval(() => {
      setTestimonialIdx((i) => (i + 1) % testimonials.length);
    }, 5000);
    return () => { if (testimonialTimer.current) clearInterval(testimonialTimer.current); };
  }, [testimonials.length]);

  const goTestimonial = (dir: number) => {
    if (testimonialTimer.current) clearInterval(testimonialTimer.current);
    setTestimonialIdx((i) => (i + dir + testimonials.length) % testimonials.length);
  };

  const today = new Date().toISOString().slice(0, 10);

  const upcomingTours = useMemo(() =>
    tours.filter((t) => t.is_active && !t.is_exclusive && t.start_date >= today).slice(0, 8),
    [tours]
  );

  const matchKeywords = (t: (typeof tours)[0], keywords: string[]) => {
    const haystack = [t.name, t.etiqueta, t.about, t.destination_name].join(" ").toLowerCase();
    return keywords.some((k) => haystack.includes(k));
  };

  const cachoeiraTours = useMemo(() =>
    tours.filter((t) => t.is_active && !t.is_exclusive && t.start_date >= today && matchKeywords(t, ["cachoeira"])).slice(0, 10),
    [tours]
  );

  const trilhaTours = useMemo(() =>
    tours.filter((t) => t.is_active && !t.is_exclusive && t.start_date >= today && matchKeywords(t, ["trilha"])).slice(0, 10),
    [tours]
  );

  const aventuraTours = useMemo(() =>
    tours.filter((t) => t.is_active && !t.is_exclusive && t.start_date >= today && matchKeywords(t, ["rapel", "tirolesa", "rope"])).slice(0, 10),
    [tours]
  );

  const allIds = useMemo(() =>
    [...new Set([...upcomingTours, ...cachoeiraTours, ...trilhaTours, ...aventuraTours].map((t) => t.id))],
    [upcomingTours, cachoeiraTours, trilhaTours, aventuraTours]
  );
  const { getCoverImage } = useTourCoverImages(allIds);

  return (
    <div className="min-h-screen bg-background">
      <TopMenu transparent />

      {/* ── HERO ──────────────────────────────────────────────────────────────── */}
      <HeroBanner />

      {/* ── STATS ─────────────────────────────────────────────────────────────── */}
      <StatsSection />

      {/* ── CACHOEIRAS ────────────────────────────────────────────────────────── */}
      {cachoeiraTours.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-8 px-4">
              <div>
                <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-1">Preferência</p>
                <h2 className="font-figtree text-3xl md:text-4xl font-bold text-foreground uppercase tracking-tight">Cachoeiras</h2>
              </div>
              <Link to="/agenda" className="hidden sm:flex items-center gap-1 text-primary font-semibold text-sm hover:gap-2 transition-all">
                Ver todas <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex overflow-x-auto gap-4 pb-4 -mx-0 px-4 scrollbar-hide snap-x snap-mandatory">
              {cachoeiraTours.map((tour) => (
                <div key={tour.id} className="shrink-0 w-72 snap-start">
                  <TourCard tour={tour} preloadedCover={getCoverImage(tour.id)} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── TRILHAS ───────────────────────────────────────────────────────────── */}
      {trilhaTours.length > 0 && (
        <section className="py-16 bg-muted/20">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-8 px-4">
              <div>
                <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-1">Preferência</p>
                <h2 className="font-figtree text-3xl md:text-4xl font-bold text-foreground uppercase tracking-tight">Trilhas</h2>
              </div>
              <Link to="/agenda" className="hidden sm:flex items-center gap-1 text-primary font-semibold text-sm hover:gap-2 transition-all">
                Ver todas <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex overflow-x-auto gap-4 pb-4 px-4 scrollbar-hide snap-x snap-mandatory">
              {trilhaTours.map((tour) => (
                <div key={tour.id} className="shrink-0 w-72 snap-start">
                  <TourCard tour={tour} preloadedCover={getCoverImage(tour.id)} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── AVENTURA ──────────────────────────────────────────────────────────── */}
      {aventuraTours.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-8 px-4">
              <div>
                <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-1">Preferência</p>
                <h2 className="font-figtree text-3xl md:text-4xl font-bold text-foreground uppercase tracking-tight">Aventura</h2>
              </div>
              <Link to="/agenda" className="hidden sm:flex items-center gap-1 text-primary font-semibold text-sm hover:gap-2 transition-all">
                Ver todas <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex overflow-x-auto gap-4 pb-4 px-4 scrollbar-hide snap-x snap-mandatory">
              {aventuraTours.map((tour) => (
                <div key={tour.id} className="shrink-0 w-72 snap-start">
                  <TourCard tour={tour} preloadedCover={getCoverImage(tour.id)} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── PRÓXIMAS AVENTURAS ────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-2">Agenda</p>
              <h2 className="font-figtree text-3xl md:text-4xl font-bold text-foreground uppercase tracking-tight">Próximas Aventuras</h2>
            </div>
            <Link to="/agenda" className="hidden sm:flex items-center gap-1 text-primary font-semibold text-sm hover:gap-2 transition-all">
              Ver todas <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {toursLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : upcomingTours.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Novas aventuras em breve!</p>
            </div>
          ) : (
            <>
              <div className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible md:pb-0 md:mx-0 md:px-0">
                {upcomingTours.map((tour) => (
                  <div key={tour.id} className="shrink-0 w-72 snap-start md:w-auto md:shrink">
                    <TourCard tour={tour} preloadedCover={getCoverImage(tour.id)} />
                  </div>
                ))}
              </div>
              <div className="text-center mt-8 sm:hidden">
                <Button asChild variant="outline" className="rounded-full">
                  <Link to="/agenda">Ver todas as aventuras <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </section>


      {/* ── DEPOIMENTOS ───────────────────────────────────────────────────────── */}
      {testimonials.length > 0 && (
        <section className="py-20 px-4 bg-gradient-to-br from-[#1a0533] to-[#3d0a6e] text-white">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-white/60 text-sm font-semibold uppercase tracking-widest mb-2">Depoimentos</p>
              <h2 className="font-figtree text-3xl md:text-4xl font-bold uppercase tracking-tight">O que dizem nossos viajantes</h2>
            </div>
            <div className="relative">
              <div className="overflow-hidden">
                <div className="text-center px-8 md:px-16">
                  <div className="flex justify-center gap-1 mb-6">
                    {Array.from({ length: testimonials[testimonialIdx]?.rating || 5 }).map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-[#820AD1] text-[#820AD1]" />
                    ))}
                  </div>
                  <blockquote className="text-white/90 text-lg md:text-xl leading-relaxed italic mb-8">
                    "{testimonials[testimonialIdx]?.text}"
                  </blockquote>
                  <div className="flex items-center justify-center gap-3">
                    {testimonials[testimonialIdx]?.photo_url ? (
                      <img src={testimonials[testimonialIdx].photo_url!} alt={testimonials[testimonialIdx].name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                        {testimonials[testimonialIdx]?.name?.[0]}
                      </div>
                    )}
                    <div className="text-left">
                      <p className="font-semibold text-white">{testimonials[testimonialIdx]?.name}</p>
                      {testimonials[testimonialIdx]?.date && (
                        <p className="text-white/50 text-xs">{testimonials[testimonialIdx].date}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {testimonials.length > 1 && (
                <>
                  <button onClick={() => goTestimonial(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button onClick={() => goTestimonial(1)} className="absolute right-0 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="flex justify-center gap-2 mt-8">
                    {testimonials.map((_, i) => (
                      <button key={i} onClick={() => { goTestimonial(0); setTestimonialIdx(i); }}
                        className={`w-2 h-2 rounded-full transition-all ${i === testimonialIdx ? "bg-white w-5" : "bg-white/30"}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── PARCEIROS ─────────────────────────────────────────────────────────── */}
      {partners.length > 0 && (
        <section className="py-16 px-4 border-y border-border">
          <div className="max-w-5xl mx-auto">
            <p className="text-center text-muted-foreground text-sm font-medium uppercase tracking-widest mb-10">
              Empresas e organizações que já viajaram com a gente
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
              {partners.map((p) => (
                <a key={p.id} href={p.website_url || "#"} target="_blank" rel="noopener noreferrer"
                  className="grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300" title={p.name}
                >
                  <img src={p.logo_url} alt={p.name} className="h-10 md:h-12 w-auto object-contain" />
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── EQUIPE ────────────────────────────────────────────────────────────── */}
      {team.length > 0 && (
        <section className="py-20 px-4 max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-2">Quem somos</p>
            <h2 className="font-figtree text-3xl md:text-4xl font-bold text-foreground uppercase tracking-tight">Conheça nossa equipe</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Apaixonados pela natureza e dedicados a criar experiências únicas para você.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {team.map((m) => (
              <div key={m.id} className="text-center">
                {m.foto_url ? (
                  <img src={m.foto_url} alt={m.nome} className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover mx-auto mb-3 ring-4 ring-primary/10" />
                ) : (
                  <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 text-primary font-bold text-2xl">
                    {m.nome[0]}
                  </div>
                )}
                <p className="font-semibold text-foreground text-sm">{m.nome}</p>
                <p className="text-primary text-xs mt-0.5">{m.cargo}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/sobre">Ver equipe completa <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </section>
      )}

      {/* ── BLOG ──────────────────────────────────────────────────────────────── */}
      {blogPosts.length > 0 && (
        <section className="py-20 px-4 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-12">
              <div>
                <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-2">Blog</p>
                <h2 className="font-figtree text-3xl md:text-4xl font-bold text-foreground uppercase tracking-tight">Últimas aventuras</h2>
              </div>
              <Link to="/blog" className="hidden sm:flex items-center gap-1 text-primary font-semibold text-sm hover:gap-2 transition-all">
                Ver todos <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {blogPosts.map((post) => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="group rounded-2xl overflow-hidden border border-border bg-card hover:shadow-lg transition-shadow">
                  {post.cover_image && (
                    <div className="aspect-video overflow-hidden">
                      <img src={post.cover_image} alt={post.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  )}
                  <div className="p-5">
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {post.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="bg-primary/10 text-primary text-[10px] font-medium px-2 py-0.5 rounded-full">{tag}</span>
                        ))}
                      </div>
                    )}
                    <h3 className="font-figtree font-bold text-foreground line-clamp-2 mb-2 uppercase tracking-tight group-hover:text-primary transition-colors">
                      {post.titulo}
                    </h3>
                    {post.excerpt && <p className="text-muted-foreground text-sm line-clamp-2">{post.excerpt}</p>}
                    {post.published_at && (
                      <p className="text-muted-foreground text-xs mt-3">
                        {new Date(post.published_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center mt-8 sm:hidden">
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/blog">Ver todos os posts <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ── CTA FINAL ─────────────────────────────────────────────────────────── */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#820AD1] to-[#1a0533]" />
        <div className="absolute inset-0 opacity-10">
          <TreePine className="absolute top-8 left-8 h-32 w-32 text-white" />
          <Waves className="absolute bottom-8 right-8 h-32 w-32 text-white" />
        </div>
        <div className="relative z-10 text-center text-white max-w-2xl mx-auto">
          <h2 className="font-figtree text-3xl md:text-5xl font-bold mb-4 uppercase tracking-tight">
            Pronto para sua<br />próxima aventura?
          </h2>
          <p className="text-white/80 text-lg mb-10">
            Reserve agora e garanta sua vaga nos próximos passeios da Camaleão Ecoturismo.
          </p>
          <Button size="lg"
            className="bg-white hover:bg-white/90 text-[#820AD1] font-bold px-10 py-6 text-base rounded-full shadow-xl"
            onClick={() => navigate("/agenda")}
          >
            Reservar agora
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      <Footer />
      <FloatingContactButton />
    </div>
  );
}
