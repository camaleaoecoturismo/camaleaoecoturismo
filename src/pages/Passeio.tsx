import { useState, useEffect, useRef, useCallback } from "react";
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
  Backpack,
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
  const [showFloating, setShowFloating] = useState(false);

  const reservaRef = useRef<HTMLDivElement>(null);
  const { availability } = useTourAvailability(tourId || "");

  // IntersectionObserver: show floating button when booking block is off-screen
  useEffect(() => {
    const el = reservaRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowFloating(!entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
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

  const pdfFilePath = tour.pdf_file_path || "";

  return (
    <div className="min-h-screen bg-background">
      <TopMenu />

      <div className="max-w-2xl mx-auto px-4 pb-28">
        {/* Back button */}
        <div className="pt-4 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>

        {/* 1. Slider — bleed to edges on mobile */}
        <div className="-mx-4 md:mx-0 md:rounded-2xl overflow-hidden mb-5">
          <TourGalleryCarousel
            tourId={tour.id}
            coverImage={tour.image_url}
            tourName={tour.name}
            isSoldOut={isSoldOut}
          />
        </div>

        {/* 2. Metadata line */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mb-2">
          {(tour.city || tour.state) && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {[tour.city, tour.state?.toUpperCase()].filter(Boolean).join(", ")}
            </span>
          )}
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
          {!isSoldOut && availability && (
            <span className="flex items-center gap-1 text-green-600">
              <Users className="w-3.5 h-3.5" />
              {availability.availableSpots} vagas
            </span>
          )}
          {isSoldOut && (
            <span className="text-red-500 font-medium">Vagas esgotadas</span>
          )}
        </div>

        {/* Title */}
        <h1 className="font-europa text-3xl md:text-4xl font-bold text-foreground tracking-wide leading-tight mb-4">
          {tour.name}
        </h1>

        {/* 3. Short description */}
        {tour.description && (
          <p className="text-muted-foreground leading-relaxed mb-6">{tour.description}</p>
        )}

        {/* 4. Two action buttons */}
        <div className="flex gap-3 mb-8">
          {tour.pdf_file_path && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setRoteiroOpen(true)}
            >
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

        {/* 5. Sobre o passeio */}
        {tour.about && (
          <section className="mb-8">
            <h2 className="font-semibold text-lg text-foreground mb-3">Sobre o passeio</h2>
            <div
              className="prose prose-sm max-w-none text-muted-foreground leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitize(tour.about) }}
            />
          </section>
        )}

        {/* 6. Roteiro */}
        {tour.itinerary && (
          <section className="mb-8">
            <h2 className="font-semibold text-lg text-foreground mb-3">Roteiro</h2>
            <div
              className="prose prose-sm max-w-none text-muted-foreground leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitize(tour.itinerary) }}
            />
          </section>
        )}

        {/* 7. Incluso / Não incluso tabs */}
        {(tour.includes || tour.not_includes) && (
          <section className="mb-8">
            {tour.includes && tour.not_includes ? (
              <>
                <div className="flex border-b border-border mb-4">
                  <button
                    onClick={() => setInclusoTab("incluso")}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors ${inclusoTab === "incluso" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    ✓ Incluso
                  </button>
                  <button
                    onClick={() => setInclusoTab("nao_incluso")}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors ${inclusoTab === "nao_incluso" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
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
              <>
                {tour.includes && (
                  <>
                    <h2 className="font-semibold text-lg text-foreground mb-3">✓ Incluso</h2>
                    <div
                      className="prose prose-sm max-w-none text-foreground leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: sanitize(tour.includes) }}
                    />
                  </>
                )}
                {tour.not_includes && (
                  <>
                    <h2 className="font-semibold text-lg text-foreground mb-3 mt-4">✗ Não incluso</h2>
                    <div
                      className="prose prose-sm max-w-none text-foreground leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: sanitize(tour.not_includes) }}
                    />
                  </>
                )}
              </>
            )}
          </section>
        )}

        {/* What to bring */}
        {tour.what_to_bring && (
          <section className="mb-8">
            <h2 className="font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
              <Backpack className="w-5 h-5" />
              O que levar
            </h2>
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div
                className="prose prose-sm max-w-none text-foreground leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sanitize(tour.what_to_bring) }}
              />
            </div>
          </section>
        )}

        {/* 8. Pontos de embarque */}
        <section className="mb-8">
          <h2 className="font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Pontos de embarque
          </h2>
          <div className="border border-border rounded-xl p-4">
            <TourBoardingPointsDisplay tourId={tour.id} departures={tour.departures} />
          </div>
        </section>

        {/* Cancellation policy */}
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

        {/* 9. Reservar block */}
        <section ref={reservaRef} className="mb-8">
          <div className="border border-border rounded-2xl p-6 bg-card shadow-sm space-y-4">
            {/* Price */}
            {minPrice > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">A partir de</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(minPrice)}</p>
                <p className="text-xs text-muted-foreground">no PIX / à vista</p>
              </div>
            )}

            {/* Pricing packages */}
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

            {/* Availability */}
            {!isSoldOut && availability && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Users className="w-4 h-4" />
                <span>{availability.availableSpots} vagas disponíveis</span>
              </div>
            )}

            {/* CTA */}
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

            {/* WhatsApp link */}
            <button
              onClick={handleWhatsApp}
              className="w-full flex items-center justify-center gap-2 text-sm text-green-600 hover:text-green-700 transition-colors py-1"
            >
              <MessageCircle className="w-4 h-4" />
              Falar com atendente
            </button>

            {/* Date summary */}
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

        {/* 10. Próximas datas — horizontal scroll */}
        {relatedTours.length > 0 && (
          <section className="mb-8">
            <h2 className="font-semibold text-lg text-foreground mb-3">Próximas datas</h2>
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
                        <p className="text-xs font-bold text-primary">
                          {formatCurrency(relPrice)}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* 11. Depoimentos */}
        {depoimentos.length > 0 && (
          <section className="mb-8">
            <h2 className="font-semibold text-xl text-foreground mb-4 flex items-center gap-2">
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
      <ReservaModal
        isOpen={reservaOpen}
        onClose={() => setReservaOpen(false)}
        tour={tour}
      />
      <WaitlistModal
        open={waitlistOpen}
        onOpenChange={setWaitlistOpen}
        tourId={tour.id}
        tourName={tour.name}
      />
      {tour.pdf_file_path && (
        <RoteiroAccessModal
          open={roteiroOpen}
          onOpenChange={setRoteiroOpen}
          tourId={tour.id}
          tourName={tour.name}
          pdfFilePath={pdfFilePath}
        />
      )}
    </div>
  );
};

export default Passeio;
