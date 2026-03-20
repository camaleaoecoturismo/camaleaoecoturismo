import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TopMenu } from "@/components/TopMenu";
import { ReservaModal } from "@/components/ReservaModal";
import { WaitlistModal } from "@/components/WaitlistModal";
import { RoteiroAccessModal } from "@/components/RoteiroAccessModal";
import { TourGalleryCarousel } from "@/components/TourGalleryCarousel";
import { TourBoardingPointsDisplay } from "@/components/TourBoardingPointsDisplay";
import { Button } from "@/components/ui/button";
import { useTourAvailability } from "@/hooks/useTourAvailability";
import { Tour } from "@/hooks/useTours";
import DOMPurify from "dompurify";
import {
  ChevronLeft,
  Calendar,
  MapPin,
  Users,
  Bell,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Package,
  Loader2,
  Star,
  FileText,
  Clock,
} from "lucide-react";

const MONTH_NAMES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

const Passeio = () => {
  const { tourId } = useParams<{ tourId: string }>();
  const navigate = useNavigate();
  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);
  const [reservaOpen, setReservaOpen] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [roteiroOpen, setRoteiroOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [inclusoTab, setInclusoTab] = useState<"incluso" | "nao_incluso">("incluso");
  const [relatedTours, setRelatedTours] = useState<Tour[]>([]);
  const [depoimentos, setDepoimentos] = useState<
    Array<{ id: string; nome: string; foto_url: string | null; texto: string; nota: number }>
  >([]);
  // Start visible — observer will hide it when booking section is on screen
  const [showFloating, setShowFloating] = useState(true);

  const reservaRef = useRef<HTMLDivElement>(null);
  const { availability } = useTourAvailability(tourId || "");

  // Re-attach IntersectionObserver after tour loads (DOM is ready)
  useEffect(() => {
    if (!tour) return;
    const attach = () => {
      const el = reservaRef.current;
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => setShowFloating(!entry.isIntersecting),
        { threshold: 0.1 }
      );
      observer.observe(el);
      return () => observer.disconnect();
    };
    // Small delay to ensure DOM is painted
    const id = setTimeout(attach, 150);
    return () => clearTimeout(id);
  }, [tour]);

  useEffect(() => {
    if (!tourId) return;
    const fetchTour = async () => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tourId);
      const query = supabase
        .from("tours")
        .select(`*, pricing_options:tour_pricing_options(id, option_name, description, pix_price, card_price)`);
      const { data, error } = await (isUuid
        ? query.eq("id", tourId)
        : query.eq("slug", tourId)
      ).single();

      if (error || !data) {
        navigate("/");
        return;
      }
      setTour(data as Tour);

      // Related tours: same city, future only, up to 8
      const today = new Date().toISOString().split("T")[0];
      const { data: related } = await supabase
        .from("tours")
        .select(`*, pricing_options:tour_pricing_options(id, option_name, pix_price, card_price)`)
        .eq("city", data.city)
        .eq("is_active", true)
        .neq("id", data.id)
        .gte("start_date", today)
        .order("start_date", { ascending: true })
        .limit(8);
      setRelatedTours((related as Tour[]) || []);

      // Depoimentos: tour-specific first, then general
      const { data: deps } = await supabase
        .from("depoimentos")
        .select("id, nome, foto_url, texto, nota, tour_id")
        .eq("ativo", true)
        .order("display_order")
        .order("created_at", { ascending: false });
      if (deps && deps.length > 0) {
        const tourDeps = deps.filter((d: any) => d.tour_id === data.id);
        const generalDeps = deps.filter((d: any) => !d.tour_id);
        setDepoimentos([...tourDeps, ...generalDeps].slice(0, 12));
      }

      setLoading(false);
    };
    fetchTour();
  }, [tourId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!tour) return null;

  const isSoldOut =
    availability?.isSoldOut ||
    tour.vagas_fechadas ||
    tour.etiqueta === "Vagas encerradas" ||
    tour.etiqueta === "vagas encerradas";

  const start = new Date(tour.start_date + "T12:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isFutureTour = start >= today;

  const end = tour.end_date ? new Date(tour.end_date + "T12:00:00") : null;
  const durationDays = end
    ? Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 1;

  const dateStr = (() => {
    const startStr = `${start.getDate()} de ${MONTH_NAMES[start.getMonth()]} de ${start.getFullYear()}`;
    if (end && tour.end_date !== tour.start_date) {
      return `${start.getDate()} a ${end.getDate()} de ${MONTH_NAMES[end.getMonth()]} de ${end.getFullYear()}`;
    }
    return startStr;
  })();

  const minPrice =
    tour.pricing_options?.length > 0
      ? Math.min(...tour.pricing_options.map((o) => o.pix_price))
      : tour.valor_padrao || 0;

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    });

  const sanitize = (html: string | null) =>
    DOMPurify.sanitize(html || "", {
      ALLOWED_TAGS: [
        "p", "br", "strong", "em", "u", "s", "ul", "ol", "li",
        "h1", "h2", "h3", "h4", "a", "blockquote", "img",
        "details", "summary", "table", "thead", "tbody", "tr", "th", "td",
        "div", "span", "pre", "code",
      ],
      ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "class", "style", "open"],
    });

  const handleWhatsApp = () => {
    const msg = `Olá! Gostaria de saber mais sobre o passeio *${tour.name}*.`;
    window.open(`https://wa.me/5582993649454?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const showEtiqueta =
    tour.etiqueta &&
    tour.etiqueta !== "Histórico" &&
    tour.etiqueta !== "Vagas encerradas" &&
    tour.etiqueta !== "vagas encerradas";

  const heroImage = tour.image_url;

  return (
    <div className="min-h-screen bg-background">
      {/* ── HERO ────────────────────────────────────────────────── */}
      <div className="relative w-full h-[70vh] min-h-[420px] overflow-hidden">
        {/* Cover photo */}
        {heroImage ? (
          <img
            src={heroImage}
            alt={tour.name}
            className={`absolute inset-0 w-full h-full object-cover ${isSoldOut ? "grayscale opacity-80" : ""}`}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-primary/10" />
        )}

        {/* Top gradient (behind menu) */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none" />

        {/* Bottom gradient (behind text) */}
        <div className="absolute bottom-0 inset-x-0 h-2/3 bg-gradient-to-t from-black/85 via-black/40 to-transparent z-10 pointer-events-none" />

        {/* TopMenu — transparent, overlaid */}
        <div className="absolute top-0 inset-x-0 z-20">
          <TopMenu transparent />
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-[72px] left-4 z-20 flex items-center gap-1 text-white/80 hover:text-white text-sm transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </button>

        {/* Gallery button — opens slider */}
        <div className="absolute bottom-5 right-4 z-20">
          <TourGalleryCarousel
            tourId={tour.id}
            coverImage={tour.image_url}
            tourName={tour.name}
            isSoldOut={isSoldOut}
            heroMode
          />
        </div>

        {/* Tour info — bottom left */}
        <div className="absolute bottom-0 left-0 right-0 z-20 px-5 pb-6 md:px-8">
          {/* City / state */}
          {(tour.city || tour.state) && (
            <p className="text-white/75 text-xs font-semibold uppercase tracking-widest mb-1">
              {[tour.city, tour.state?.toUpperCase()].filter(Boolean).join(" · ")}
            </p>
          )}

          {/* Tour name */}
          <h1 className="font-europa text-3xl md:text-5xl font-bold text-white tracking-wide leading-tight mb-2 drop-shadow-md">
            {tour.name}
          </h1>

          {/* Date + duration */}
          <p className="text-white/75 text-sm flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {dateStr}
            </span>
            {durationDays > 1 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {durationDays} dias
              </span>
            )}
          </p>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mt-2.5">
            {isSoldOut && (
              <span className="bg-red-600 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md">
                Esgotado
              </span>
            )}
            {!isSoldOut && availability && (
              <span className="bg-green-600/90 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md flex items-center gap-1">
                <Users className="w-3 h-3" />
                {availability.availableSpots} vagas
              </span>
            )}
            {tour.is_featured && (
              <span className="bg-yellow-400 text-yellow-900 text-[11px] font-bold px-2.5 py-1 rounded-md">
                ⭐ DESTAQUE
              </span>
            )}
            {showEtiqueta && (
              <span className="bg-primary/90 text-primary-foreground text-[11px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wide">
                {tour.etiqueta}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── BODY ────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 pb-28">

        {/* Short description */}
        {tour.description && (
          <p className="text-muted-foreground leading-relaxed mt-5 mb-6">{tour.description}</p>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 mb-8 mt-5">
          {tour.pdf_file_path && (
            <Button variant="outline" className="flex-1" onClick={() => setRoteiroOpen(true)}>
              <FileText className="w-4 h-4 mr-2" />
              Ver roteiro
            </Button>
          )}
          <Button
            variant="outline"
            className="flex-1 border-green-500 text-green-600 hover:bg-green-50"
            onClick={handleWhatsApp}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Falar com atendente
          </Button>
        </div>

        {/* Sobre o passeio */}
        {tour.about && (
          <section className="mb-8">
            <h2 className="font-semibold text-lg text-primary mb-3">Sobre o passeio</h2>
            <div
              className="prose prose-sm max-w-none text-muted-foreground leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitize(tour.about) }}
            />
          </section>
        )}

        {/* Roteiro */}
        {tour.itinerary && (
          <section className="mb-8">
            <h2 className="font-semibold text-lg text-primary mb-3">Roteiro</h2>
            <div
              className="prose prose-sm max-w-none text-muted-foreground leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitize(tour.itinerary) }}
            />
          </section>
        )}

        {/* Incluso / Não incluso */}
        {(tour.includes || tour.not_includes) && (
          <section className="mb-8">
            <h2 className="font-semibold text-lg text-primary mb-3">Inclusos</h2>
            {tour.includes && tour.not_includes ? (
              <>
                <div className="flex justify-center border-b border-border mb-4">
                  <button
                    onClick={() => setInclusoTab("incluso")}
                    className={`px-8 py-2.5 text-sm font-medium transition-colors ${inclusoTab === "incluso" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    ✓ Incluso
                  </button>
                  <button
                    onClick={() => setInclusoTab("nao_incluso")}
                    className={`px-8 py-2.5 text-sm font-medium transition-colors ${inclusoTab === "nao_incluso" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    ✗ Não incluso
                  </button>
                </div>
                <div
                  className="prose prose-sm max-w-none text-foreground leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: sanitize(inclusoTab === "incluso" ? tour.includes : tour.not_includes),
                  }}
                />
              </>
            ) : (
              <div
                className="prose prose-sm max-w-none text-foreground leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sanitize(tour.includes || tour.not_includes) }}
              />
            )}
          </section>
        )}

        {/* Pontos de embarque */}
        <section className="mb-8">
          <h2 className="font-semibold text-lg text-primary mb-3 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Pontos de embarque
          </h2>
          <TourBoardingPointsDisplay tourId={tour.id} departures={tour.departures} />
        </section>

        {/* Política de cancelamento */}
        {tour.policy && (
          <section className="mb-8">
            <button
              onClick={() => setPolicyOpen(!policyOpen)}
              className="w-full flex items-center justify-between py-3 border-b border-border text-left"
            >
              <span className="font-semibold text-foreground">Política de cancelamento</span>
              {policyOpen ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
            {policyOpen && (
              <div
                className="pt-4 prose prose-sm max-w-none text-muted-foreground leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sanitize(tour.policy) }}
              />
            )}
          </section>
        )}

        {/* Reservar block */}
        <section ref={reservaRef} className="mb-8">
          <div className="border border-border rounded-2xl p-6 bg-card shadow-sm space-y-4">
            {minPrice > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">A partir de</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(minPrice)}</p>
                <p className="text-xs text-muted-foreground">no PIX / à vista</p>
              </div>
            )}

            {tour.pricing_options && tour.pricing_options.length > 1 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Pacotes disponíveis
                </p>
                {tour.pricing_options.map((opt) => (
                  <div
                    key={opt.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary/60 shrink-0" />
                      <span className="text-sm font-medium text-foreground">{opt.option_name}</span>
                    </div>
                    <span className="text-sm font-bold text-primary">{formatCurrency(opt.pix_price)}</span>
                  </div>
                ))}
              </div>
            )}

            {!isSoldOut && availability && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Users className="w-4 h-4" />
                <span>{availability.availableSpots} vagas disponíveis</span>
              </div>
            )}

            {isSoldOut ? (
              <div className="space-y-2">
                <div className="w-full bg-muted text-muted-foreground text-center py-3 rounded-lg text-sm font-medium">
                  Vagas Esgotadas
                </div>
                {isFutureTour && (
                  <Button
                    variant="outline"
                    className="w-full border-orange-400 text-orange-600 hover:bg-orange-50"
                    onClick={() => setWaitlistOpen(true)}
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Entrar na lista de espera
                  </Button>
                )}
              </div>
            ) : (
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-base font-semibold"
                onClick={() => setReservaOpen(true)}
              >
                Reservar agora
              </Button>
            )}

            <button
              onClick={handleWhatsApp}
              className="w-full flex items-center justify-center gap-2 text-sm text-green-600 hover:text-green-700 transition-colors py-1"
            >
              <MessageCircle className="w-4 h-4" />
              Falar com atendente
            </button>

            <div className="pt-2 border-t border-border text-sm text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Data</span>
                <span className="font-medium text-foreground">{dateStr}</span>
              </div>
              {durationDays > 1 && (
                <div className="flex justify-between">
                  <span>Duração</span>
                  <span className="font-medium text-foreground">{durationDays} dias</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Local</span>
                <span className="font-medium text-foreground">
                  {[tour.city, tour.state?.toUpperCase()].filter(Boolean).join(", ")}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Próximas datas */}
        {relatedTours.length > 0 && (
          <section className="mb-8">
            <h2 className="font-semibold text-lg text-primary mb-3">Próximas datas</h2>
            <div className="flex overflow-x-auto gap-3 pb-2 snap-x -mx-4 px-4">
              {relatedTours.map((related) => {
                const relStart = new Date(related.start_date + "T12:00:00");
                const relEnd = related.end_date ? new Date(related.end_date + "T12:00:00") : null;
                const relPrice =
                  related.pricing_options?.length > 0
                    ? Math.min(...related.pricing_options.map((o) => o.pix_price))
                    : related.valor_padrao || 0;
                const relDays = relEnd
                  ? Math.ceil((relEnd.getTime() - relStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
                  : 1;
                return (
                  <button
                    key={related.id}
                    onClick={() => navigate(`/passeio/${related.slug || related.id}`)}
                    className="w-44 shrink-0 snap-start text-left rounded-xl border border-border overflow-hidden hover:border-primary hover:shadow-sm transition-all bg-card"
                  >
                    {related.image_url && (
                      <div className="aspect-[4/3] overflow-hidden">
                        <img
                          src={related.image_url}
                          alt={related.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="p-3 space-y-0.5">
                      <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
                        {related.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {relStart.getDate()} de {MONTH_NAMES[relStart.getMonth()]}
                        {relDays > 1 ? ` · ${relDays} dias` : ""}
                      </p>
                      {relPrice > 0 && (
                        <p className="text-xs font-bold text-primary">{formatCurrency(relPrice)}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Depoimentos */}
        {depoimentos.length > 0 && (
          <section className="mb-8">
            <h2 className="font-semibold text-xl text-primary mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              O que dizem nossos viajantes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {depoimentos.map((d) => (
                <div
                  key={d.id}
                  className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3"
                >
                  <div className="flex items-center gap-3">
                    {d.foto_url ? (
                      <img
                        src={d.foto_url}
                        alt={d.nome}
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {d.nome.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-foreground text-sm">{d.nome}</p>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${i < d.nota ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">"{d.texto}"</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Floating "Reservar agora" button */}
      <div
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
          showFloating ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        {isSoldOut && isFutureTour ? (
          <Button
            onClick={() => setWaitlistOpen(true)}
            className="h-12 px-6 rounded-full shadow-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm"
          >
            <Bell className="w-4 h-4 mr-2" />
            Lista de espera
          </Button>
        ) : !isSoldOut ? (
          <Button
            onClick={() => setReservaOpen(true)}
            className="h-12 px-6 rounded-full shadow-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm"
          >
            Reservar agora
            {minPrice > 0 && ` — ${formatCurrency(minPrice)}`}
          </Button>
        ) : null}
      </div>

      {/* Modals */}
      <ReservaModal isOpen={reservaOpen} onClose={() => setReservaOpen(false)} tour={tour} />
      <WaitlistModal open={waitlistOpen} onOpenChange={setWaitlistOpen} tourId={tour.id} tourName={tour.name} />
      {tour.pdf_file_path && (
        <RoteiroAccessModal
          open={roteiroOpen}
          onOpenChange={setRoteiroOpen}
          tourId={tour.id}
          tourName={tour.name}
          pdfFilePath={tour.pdf_file_path}
        />
      )}
    </div>
  );
};

export default Passeio;
