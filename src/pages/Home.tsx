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
  { target: 6,     suffix: "",   prefix: "+", label: "anos" },
  { target: 5000,  suffix: "",   prefix: "+", label: "viajantes", format: (n: number) => n >= 1000 ? `+${Math.round(n/1000)}mil` : `+${n}` },
  { target: 25,    suffix: "",   prefix: "+", label: "roteiros" },
  { target: 60000, suffix: "",   prefix: "+", label: "fotos", format: (n: number) => n >= 1000 ? `+${Math.round(n/1000)}mil` : `+${n}` },
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
      <div className="max-w-4xl mx-auto px-4 py-10 grid grid-cols-4">
        {STATS.map((s, i) => (
          <div key={s.label} className={`flex flex-col items-center text-center py-4 px-1 border-border/50 ${i < 3 ? "border-r" : ""}`}>
            <span className="font-figtree text-xl sm:text-3xl md:text-4xl font-bold text-[#820AD1] leading-none tabular-nums">
              {format(i, counts[i])}
            </span>
            <span className="text-[9px] sm:text-xs text-muted-foreground mt-1 uppercase tracking-widest leading-tight">{s.label}</span>
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

interface HomeSection {
  id: string;
  title: string;
  subtitle: string | null;
  filter_type: string;
  filter_value: string;
  order_index: number;
  active: boolean;
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
  const [homeSections, setHomeSections] = useState<HomeSection[]>([]);
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

    supabase.from("home_sections" as any).select("*").eq("active", true).order("order_index")
      .then(({ data }) => { if (data) setHomeSections(data as HomeSection[]); });

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
    tours.filter((t) => t.is_active && !t.is_exclusive && !t.vagas_fechadas && t.start_date >= today).slice(0, 8),
    [tours]
  );

  const getSectionTours = (section: HomeSection) => {
    const val = section.filter_value.toLowerCase();
    return tours.filter((t) => {
      if (!t.is_active || t.is_exclusive || t.vagas_fechadas || t.start_date < today) return false;
      switch (section.filter_type) {
        case "keyword": {
          const haystack = [t.name, t.etiqueta, t.about, t.destination_name].join(" ").toLowerCase();
          return haystack.includes(val);
        }
        case "city":
          return (t.city || "").toLowerCase().includes(val);
        case "state":
          return (t.state || "").toLowerCase().includes(val);
        case "destination":
          return (t.destination_name || "").toLowerCase().includes(val);
        default:
          return false;
      }
    }).slice(0, 10);
  };

  const allIds = useMemo(() => {
    const sectionIds = homeSections.flatMap((s) => getSectionTours(s).map((t) => t.id));
    return [...new Set([...upcomingTours.map((t) => t.id), ...sectionIds])];
  }, [upcomingTours, homeSections, tours]);

  const { getCoverImage } = useTourCoverImages(allIds);

  return (
    <div className="min-h-screen bg-background">
      <TopMenu transparent />

      {/* ── HERO ──────────────────────────────────────────────────────────────── */}
      <HeroBanner />

      {/* ── SEÇÕES DINÂMICAS ──────────────────────────────────────────────────── */}
      {homeSections.map((section, idx) => {
        const sectionTours = getSectionTours(section);
        if (sectionTours.length === 0) return null;
        const altBg = idx % 2 === 1;
        return (
          <section key={section.id} className={`py-16 ${altBg ? "bg-muted/20" : ""}`}>
            <div className="max-w-7xl mx-auto">
              <div className="flex items-end justify-between mb-8 px-4">
                <div>
                  {section.subtitle && (
                    <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-1">{section.subtitle}</p>
                  )}
                  <h2 className="font-figtree text-3xl md:text-4xl font-bold text-foreground uppercase tracking-tight">{section.title}</h2>
                </div>
                <Link to="/agenda" className="hidden sm:flex items-center gap-1 text-primary font-semibold text-sm hover:gap-2 transition-all">
                  Ver todas <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="flex overflow-x-auto gap-4 pb-4 px-4 scrollbar-hide snap-x snap-mandatory">
                {sectionTours.map((tour) => (
                  <div key={tour.id} className="shrink-0 w-72 snap-start">
                    <TourCard tour={tour} preloadedCover={getCoverImage(tour.id)} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })}

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
              <div className="flex overflow-x-auto gap-4 pb-4 px-4 scrollbar-hide snap-x snap-mandatory">
                {upcomingTours.map((tour) => (
                  <div key={tour.id} className="shrink-0 w-72 snap-start">
                    <TourCard tour={tour} preloadedCover={getCoverImage(tour.id)} />
                  </div>
                ))}
              </div>
              <div className="sm:hidden flex justify-end px-4 mt-4">
                <Link to="/agenda" className="flex items-center gap-1 text-primary font-semibold text-sm">
                  Ver todos <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </>
          )}
        </div>
      </section>


      {/* ── DEPOIMENTOS ───────────────────────────────────────────────────────── */}
      {/* ── DEPOIMENTOS (Google Reviews via Elfsight) ─────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-2">Avaliações</p>
            <h2 className="font-figtree text-3xl md:text-4xl font-bold uppercase tracking-tight text-foreground">O que dizem nossos viajantes</h2>
          </div>
          <div className="elfsight-app-fc1cf9ea-c516-40e2-86de-0bc549b59b05" data-elfsight-app-lazy />
        </div>
      </section>

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
        <section className="py-20 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between px-4 mb-8">
              <div>
                <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-2">Blog</p>
                <h2 className="font-figtree text-lg md:text-2xl font-bold text-foreground uppercase tracking-tight whitespace-nowrap">Fique por dentro das novidades</h2>
              </div>
              <Link to="/blog" className="hidden md:flex items-center gap-1 text-primary font-semibold text-sm hover:gap-2 transition-all shrink-0 ml-6">
                Ver todos <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Mobile: scroll horizontal / Desktop: grid 3 colunas */}
            <div className="flex md:grid md:grid-cols-3 gap-5 overflow-x-auto md:overflow-visible snap-x snap-mandatory scroll-smooth px-4 md:px-4 pb-3 md:pb-0" style={{ scrollbarWidth: "none" }}>
              {blogPosts.map((post) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className="group rounded-2xl overflow-hidden border border-border bg-card hover:shadow-lg transition-shadow shrink-0 w-[75vw] max-w-xs md:w-auto md:max-w-none snap-start"
                >
                  {post.cover_image && (
                    <div className="aspect-video overflow-hidden">
                      <img src={post.cover_image} alt={post.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  )}
                  <div className="p-5">
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

            {/* Ver todos — abaixo dos cards no mobile, oculto no desktop */}
            <div className="md:hidden flex justify-end px-4 mt-4">
              <Link to="/blog" className="flex items-center gap-1 text-primary font-semibold text-sm">
                Ver todos <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── STATS ─────────────────────────────────────────────────────────────── */}
      <StatsSection />

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
