import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TopMenu } from "@/components/TopMenu";
import Footer from "@/components/Footer";
import { FloatingContactButton } from "@/components/FloatingContactButton";
import { useTours } from "@/hooks/useTours";
import { useTourCoverImages } from "@/hooks/useTourCoverImages";
import { Star, ArrowRight, ChevronDown, Loader2, CalendarDays } from "lucide-react";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

const formatShortDate = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
};

const STATS = [
  { value: "6", label: "anos de operação" },
  { value: "+5.000", label: "viajantes atendidos" },
  { value: "+25", label: "roteiros únicos" },
  { value: "+60.000", label: "fotos registradas" },
];

// ─── Componente principal ──────────────────────────────────────────────────────

export default function Home() {
  const navigate = useNavigate();
  const { tours, loading: toursLoading } = useTours();

  const [heroImage, setHeroImage] = useState<string>("");
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);

  // ── SEO + fetch ───────────────────────────────────────────────────────────────

  useEffect(() => {
    document.title = "Camaleão Ecoturismo — Reconecte-se com a natureza";
    document.querySelector('meta[name="description"]')?.setAttribute(
      "content",
      "Trilhas, cachoeiras e aventuras inesquecíveis em Alagoas e na Chapada Diamantina. Ecoturismo de verdade. Reserve sua experiência."
    );

    supabase
      .from("banners")
      .select("image_url")
      .eq("is_active", true)
      .order("display_order")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { if (data?.image_url) setHeroImage(data.image_url); });

    supabase
      .from("testimonials" as any)
      .select("id, name, photo_url, text, rating, date")
      .eq("active", true)
      .order("display_order")
      .then(({ data }) => { if (data) setTestimonials(data as Testimonial[]); });

    supabase
      .from("partner_organizations" as any)
      .select("id, name, logo_url, website_url")
      .eq("active", true)
      .order("display_order")
      .then(({ data }) => { if (data) setPartners(data as Partner[]); });

    supabase
      .from("team_members")
      .select("id, nome, cargo, bio, foto_url")
      .order("display_order")
      .limit(4)
      .then(({ data }) => { if (data) setTeam(data); });

    supabase
      .from("blog_posts")
      .select("id, titulo, slug, excerpt, cover_image, published_at, tags")
      .eq("publicado", true)
      .order("published_at", { ascending: false })
      .limit(3)
      .then(({ data }) => { if (data) setBlogPosts(data); });

    return () => { document.title = "Camaleão Ecoturismo"; };
  }, []);

  // ── Dados derivados ───────────────────────────────────────────────────────────

  const today = new Date().toISOString().slice(0, 10);

  const destinations = useMemo(() => {
    if (!tours.length) return [];
    const map = new Map<string, { count: number; image: string | null; city: string; state: string }>();
    tours
      .filter((t) => t.is_active && !t.is_exclusive && t.start_date >= today)
      .forEach((t) => {
        if (!map.has(t.city)) map.set(t.city, { count: 0, image: t.image_url, city: t.city, state: t.state });
        map.get(t.city)!.count += 1;
      });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [tours]);

  const upcomingTours = useMemo(() =>
    tours
      .filter((t) => t.is_active && !t.is_exclusive && t.start_date >= today)
      .slice(0, 10),
    [tours]
  );

  const tourIds = useMemo(() => upcomingTours.map((t) => t.id), [upcomingTours]);
  const { getCoverImage } = useTourCoverImages(tourIds);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white">
      <TopMenu transparent />

      {/* ── HERO ──────────────────────────────────────────────────────────────── */}
      <section className="relative h-[100svh] min-h-[600px] flex items-end justify-center overflow-hidden">
        {heroImage ? (
          <img
            src={heroImage}
            alt="Camaleão Ecoturismo"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#820AD1] via-[#5a0890] to-[#1a0533]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/30" />

        <div className="relative z-10 w-full max-w-5xl mx-auto px-5 pb-20 md:pb-28 text-left">
          <p className="text-white/60 uppercase tracking-[0.3em] text-[10px] md:text-xs font-medium mb-5">
            Ecoturismo · Alagoas · Chapada Diamantina
          </p>
          <h1 className="font-playfair text-5xl md:text-7xl lg:text-8xl font-bold text-white leading-[1.05] mb-4">
            Reconecte-se<br />com a natureza
          </h1>
          <p className="font-playfair italic text-white/75 text-xl md:text-2xl mb-10">
            Experimente a liberdade
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate("/agenda")}
              className="inline-flex items-center justify-center gap-2 bg-[#820AD1] hover:bg-[#6e09b0] text-white font-medium text-sm px-8 py-4 rounded-full transition-colors"
            >
              Explorar passeios
              <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href="https://wa.me/5582993649454"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-medium text-sm px-8 py-4 rounded-full border border-white/30 transition-colors"
            >
              Falar com a gente
            </a>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/40 animate-bounce">
          <ChevronDown className="h-5 w-5" />
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────────────────────── */}
      <section className="py-14 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-5 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map(({ value, label }) => (
            <div key={label}>
              <p className="font-playfair text-4xl font-bold text-[#820AD1]">{value}</p>
              <p className="text-sm text-gray-500 mt-1.5 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRÓXIMAS EXPERIÊNCIAS (horizontal scroll) ─────────────────────────── */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-8 px-5">
            <div>
              <p className="text-[#820AD1] text-[10px] uppercase tracking-[0.25em] font-medium mb-2">Agenda</p>
              <h2 className="font-playfair text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                Próximas<br />Experiências
              </h2>
            </div>
            <Link
              to="/agenda"
              className="text-[#820AD1] text-sm font-medium flex items-center gap-1.5 hover:gap-2.5 transition-all shrink-0"
            >
              Ver agenda <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {toursLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-[#820AD1]/40" />
            </div>
          ) : upcomingTours.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Novas experiências em breve</p>
            </div>
          ) : (
            <div className="flex overflow-x-auto gap-3 pb-4 px-5 scrollbar-hide snap-x snap-mandatory">
              {upcomingTours.map((tour) => {
                const cover = getCoverImage(tour.id);
                const minPrice = tour.pricing_options?.length
                  ? Math.min(...tour.pricing_options.map((o) => o.pix_price))
                  : null;
                return (
                  <Link
                    key={tour.id}
                    to={`/passeio/${tour.id}`}
                    className="shrink-0 w-56 md:w-64 snap-start group"
                  >
                    <div className="relative rounded-2xl overflow-hidden aspect-[3/4]">
                      {(cover?.url || tour.image_url) ? (
                        <img
                          src={cover?.url || tour.image_url!}
                          alt={tour.name}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          loading="lazy"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#820AD1] to-[#4a0080]" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                        <p className="text-[10px] uppercase tracking-widest text-white/55 mb-1">
                          {formatShortDate(tour.start_date)} · {tour.city}
                        </p>
                        <p className="font-playfair font-bold text-base leading-snug line-clamp-2">
                          {tour.card_name_main || tour.name}
                        </p>
                        {minPrice !== null && (
                          <p className="text-[11px] text-white/70 mt-2">
                            a partir de <span className="text-white font-semibold">{formatCurrency(minPrice)}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── NOSSOS DESTINOS (estilo Vivala) ───────────────────────────────────── */}
      {destinations.length > 0 && (
        <section className="py-16 bg-[#faf8ff]">
          <div className="max-w-7xl mx-auto px-5">
            <div className="mb-10">
              <p className="text-[#820AD1] text-[10px] uppercase tracking-[0.25em] font-medium mb-2">Explore</p>
              <h2 className="font-playfair text-3xl md:text-4xl font-bold text-gray-900">Nossos Destinos</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {destinations.map((d) => (
                <Link key={d.city} to="/agenda" className="group">
                  <div className="relative rounded-2xl overflow-hidden aspect-[3/4]">
                    {d.image ? (
                      <img
                        src={d.image}
                        alt={d.city}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#820AD1] to-[#4a0080]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-transparent" />
                    <div className="absolute top-0 left-0 p-4 text-white">
                      <p className="text-[10px] uppercase tracking-widest text-white/65">{d.state}</p>
                      <h3 className="font-bold text-lg md:text-xl leading-tight mt-0.5 uppercase">
                        {d.city}
                      </h3>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2.5 px-0.5">
                    {d.count} {d.count === 1 ? "passeio disponível" : "passeios disponíveis"}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── DEPOIMENTOS ───────────────────────────────────────────────────────── */}
      {testimonials.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10 px-5">
              <p className="text-[#820AD1] text-[10px] uppercase tracking-[0.25em] font-medium mb-2">Depoimentos</p>
              <h2 className="font-playfair text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                O que dizem<br />nossos viajantes
              </h2>
            </div>
            <div className="flex overflow-x-auto md:grid md:grid-cols-3 gap-4 pb-4 px-5 scrollbar-hide snap-x snap-mandatory md:snap-none">
              {testimonials.slice(0, 6).map((t) => (
                <div
                  key={t.id}
                  className="shrink-0 w-[300px] md:w-auto snap-start bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"
                >
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: Math.min(t.rating, 5) }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-[#820AD1] text-[#820AD1]" />
                    ))}
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed italic line-clamp-4">
                    "{t.text}"
                  </p>
                  <div className="flex items-center gap-3 mt-5">
                    {t.photo_url ? (
                      <img src={t.photo_url} alt={t.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[#820AD1]/10 flex items-center justify-center text-[#820AD1] font-bold text-sm shrink-0">
                        {t.name[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{t.name}</p>
                      {t.date && <p className="text-xs text-gray-400">{t.date}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── EQUIPE ────────────────────────────────────────────────────────────── */}
      {team.length > 0 && (
        <section className="py-16 bg-[#faf8ff]">
          <div className="max-w-7xl mx-auto px-5">
            <div className="text-center mb-10">
              <p className="text-[#820AD1] text-[10px] uppercase tracking-[0.25em] font-medium mb-2">Quem somos</p>
              <h2 className="font-playfair text-3xl md:text-4xl font-bold text-gray-900">Nossa equipe</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
              {team.map((m) => (
                <div key={m.id}>
                  {m.foto_url ? (
                    <img
                      src={m.foto_url}
                      alt={m.nome}
                      className="w-full aspect-square object-cover rounded-2xl mb-3"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full aspect-square rounded-2xl bg-[#820AD1]/8 flex items-center justify-center mb-3 text-[#820AD1] font-playfair font-bold text-5xl">
                      {m.nome[0]}
                    </div>
                  )}
                  <p className="font-semibold text-gray-900 text-sm">{m.nome}</p>
                  <p className="text-[#820AD1] text-xs mt-0.5">{m.cargo}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-12">
              <Link
                to="/sobre"
                className="text-[#820AD1] text-sm font-medium inline-flex items-center gap-1.5 hover:gap-2.5 transition-all"
              >
                Conheça a equipe completa <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── BLOG ──────────────────────────────────────────────────────────────── */}
      {blogPosts.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-5">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-[#820AD1] text-[10px] uppercase tracking-[0.25em] font-medium mb-2">Blog</p>
                <h2 className="font-playfair text-3xl md:text-4xl font-bold text-gray-900">Últimas histórias</h2>
              </div>
              <Link
                to="/blog"
                className="text-[#820AD1] text-sm font-medium hidden sm:flex items-center gap-1.5 hover:gap-2.5 transition-all shrink-0"
              >
                Ver todas <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {blogPosts.map((post) => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="group">
                  {post.cover_image && (
                    <div className="rounded-2xl overflow-hidden aspect-video mb-4">
                      <img
                        src={post.cover_image}
                        alt={post.titulo}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                  )}
                  {post.tags?.[0] && (
                    <span className="text-[#820AD1] text-[10px] uppercase tracking-widest font-medium">
                      {post.tags[0]}
                    </span>
                  )}
                  <h3 className="font-playfair font-bold text-gray-900 text-lg leading-snug mt-1 group-hover:text-[#820AD1] transition-colors line-clamp-2">
                    {post.titulo}
                  </h3>
                  {post.published_at && (
                    <p className="text-gray-400 text-xs mt-2">
                      {new Date(post.published_at).toLocaleDateString("pt-BR", {
                        day: "2-digit", month: "long", year: "numeric",
                      })}
                    </p>
                  )}
                </Link>
              ))}
            </div>
            <div className="text-center mt-8 sm:hidden">
              <Link to="/blog" className="text-[#820AD1] text-sm font-medium inline-flex items-center gap-1.5">
                Ver todas as histórias <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── PARCEIROS ─────────────────────────────────────────────────────────── */}
      {partners.length > 0 && (
        <section className="py-12 border-t border-gray-100">
          <div className="max-w-5xl mx-auto px-5">
            <p className="text-center text-gray-400 text-[10px] uppercase tracking-[0.25em] mb-10">
              Empresas e organizações que já viajaram com a gente
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-14">
              {partners.map((p) => (
                <a
                  key={p.id}
                  href={p.website_url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                  title={p.name}
                >
                  <img src={p.logo_url} alt={p.name} className="h-8 md:h-10 w-auto object-contain" />
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA FINAL ─────────────────────────────────────────────────────────── */}
      <section className="bg-[#820AD1] py-24 px-5">
        <div className="max-w-2xl mx-auto text-center text-white">
          <p className="text-white/60 text-[10px] uppercase tracking-[0.3em] mb-5">Reserve sua vaga</p>
          <h2 className="font-playfair text-4xl md:text-5xl font-bold leading-tight mb-5">
            Pronta para sua<br />próxima aventura?
          </h2>
          <p className="text-white/70 text-base mb-10 max-w-md mx-auto">
            Garanta sua vaga nos próximos passeios e viva uma experiência que você nunca vai esquecer.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://wa.me/5582993649454"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white text-[#820AD1] font-semibold text-sm px-8 py-4 rounded-full hover:bg-white/90 transition-colors"
            >
              Falar com a Camaleão
              <ArrowRight className="h-4 w-4" />
            </a>
            <button
              onClick={() => navigate("/agenda")}
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium text-sm px-8 py-4 rounded-full border border-white/25 transition-colors"
            >
              Ver todos os passeios
            </button>
          </div>
        </div>
      </section>

      <Footer />
      <FloatingContactButton />
    </div>
  );
}
