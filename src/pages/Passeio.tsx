import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TopMenu } from "@/components/TopMenu";
import { ReservaModal } from "@/components/ReservaModal";
import { WaitlistModal } from "@/components/WaitlistModal";
import { TourGalleryCarousel } from "@/components/TourGalleryCarousel";
import { TourBoardingPointsDisplay } from "@/components/TourBoardingPointsDisplay";
import { FloatingContactButton } from "@/components/FloatingContactButton";
import { Button } from "@/components/ui/button";
import { useTourAvailability } from "@/hooks/useTourAvailability";
import { Tour } from "@/hooks/useTours";
import DOMPurify from "dompurify";
import {
  ChevronLeft,
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  Backpack,
  Bell,
  MessageCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Package,
  Loader2,
  Star,
  CreditCard,
} from "lucide-react";
import { PixIcon } from "@/components/icons/PixIcon";

const Passeio = () => {
  const { tourId } = useParams<{ tourId: string }>();
  const navigate = useNavigate();
  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);
  const [reservaOpen, setReservaOpen] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [relatedTours, setRelatedTours] = useState<Tour[]>([]);
  const [depoimentos, setDepoimentos] = useState<Array<{
    id: string; nome: string; foto_url: string | null; texto: string; nota: number;
  }>>([]);

  const { availability } = useTourAvailability(tourId || "");

  useEffect(() => {
    if (!tourId) return;
    const fetchTour = async () => {
      const { data, error } = await supabase
        .from("tours")
        .select(`
          *,
          pricing_options:tour_pricing_options(
            id, option_name, description, pix_price, card_price
          )
        `)
        .eq("id", tourId)
        .single();

      if (error || !data) {
        navigate("/");
        return;
      }
      setTour(data as Tour);

      // Fetch related tours (same city, different id)
      const { data: related } = await supabase
        .from("tours")
        .select(`*, pricing_options:tour_pricing_options(id, option_name, pix_price, card_price)`)
        .eq("city", data.city)
        .eq("is_active", true)
        .neq("id", tourId)
        .limit(4);
      setRelatedTours((related as Tour[]) || []);

      // Fetch testimonials for this tour, then fallback to general ones
      const { data: deps } = await supabase
        .from("depoimentos")
        .select("id, nome, foto_url, texto, nota, tour_id")
        .eq("ativo", true)
        .order("display_order")
        .order("created_at", { ascending: false });
      if (deps && deps.length > 0) {
        // Prefer tour-specific, then fill with general
        const tourDeps = deps.filter((d: any) => d.tour_id === tourId);
        const generalDeps = deps.filter((d: any) => !d.tour_id);
        const combined = [...tourDeps, ...generalDeps].slice(0, 12);
        setDepoimentos(combined);
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
    tour.etiqueta === "Vagas encerradas";

  const tourStartDate = new Date(tour.start_date + "T12:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isFutureTour = tourStartDate >= today;

  const monthNames = [
    "jan", "fev", "mar", "abr", "mai", "jun",
    "jul", "ago", "set", "out", "nov", "dez",
  ];
  const start = new Date(tour.start_date + "T12:00:00");
  const dateStr = (() => {
    const startStr = `${start.getDate()} de ${monthNames[start.getMonth()]} de ${start.getFullYear()}`;
    if (tour.end_date && tour.end_date !== tour.start_date) {
      const end = new Date(tour.end_date + "T12:00:00");
      return `${start.getDate()} a ${end.getDate()} de ${monthNames[end.getMonth()]} de ${end.getFullYear()}`;
    }
    return startStr;
  })();

  const durationDays = (() => {
    if (tour.end_date && tour.end_date !== tour.start_date) {
      const end = new Date(tour.end_date + "T12:00:00");
      return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
    return 1;
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
      ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "s", "ul", "ol", "li", "h1", "h2", "h3", "a"],
      ALLOWED_ATTR: ["href", "target", "rel"],
    });

  return (
    <div className="min-h-screen bg-background">
      <TopMenu />

      {/* Back button */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </button>
      </div>

      {/* Main layout */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 pb-16">
        {/* Header */}
        <div className="mt-4 mb-6">
          <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {tour.city}, {tour.state}
          </p>
          <h1 className="font-sans font-bold text-3xl md:text-5xl text-foreground tracking-wide leading-tight">
            {tour.name}
          </h1>
          <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {dateStr}
            </span>
            {durationDays > 1 && (
              <span className="flex items-center gap-1.5">
                <Info className="w-4 h-4" />
                {durationDays} dias
              </span>
            )}
            {availability && !isSoldOut && (
              <span className="flex items-center gap-1.5 text-green-600">
                <Users className="w-4 h-4" />
                {availability.availableSpots} vagas disponíveis
              </span>
            )}
            {isSoldOut && (
              <span className="flex items-center gap-1.5 text-red-500 font-medium">
                Vagas esgotadas
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column — content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Gallery */}
            <div className="rounded-2xl overflow-hidden">
              <TourGalleryCarousel
                tourId={tour.id}
                coverImage={tour.image_url}
                tourName={tour.name}
                isSoldOut={isSoldOut}
                isExpanded={true}
              />
            </div>

            {/* About */}
            {tour.about && (
              <section>
                <h2 className="font-semibold text-lg text-foreground mb-3">
                  Sobre o passeio
                </h2>
                <div
                  className="rich-text-content text-sm text-muted-foreground leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: sanitize(tour.about) }}
                />
              </section>
            )}

            {/* Included / Not included */}
            {(tour.includes || tour.not_includes) && (
              <section>
                <h2 className="font-semibold text-lg text-foreground mb-3">
                  O que está incluso
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {tour.includes && (
                    <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                        <span className="font-semibold text-green-700 dark:text-green-400 text-sm">
                          Incluso
                        </span>
                      </div>
                      <div
                        className="text-sm text-foreground leading-relaxed rich-text-content"
                        dangerouslySetInnerHTML={{ __html: sanitize(tour.includes) }}
                      />
                    </div>
                  )}
                  {tour.not_includes && (
                    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                        <span className="font-semibold text-red-600 dark:text-red-400 text-sm">
                          Não incluso
                        </span>
                      </div>
                      <div
                        className="text-sm text-foreground leading-relaxed rich-text-content"
                        dangerouslySetInnerHTML={{ __html: sanitize(tour.not_includes) }}
                      />
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Itinerary */}
            {tour.itinerary && (
              <section>
                <h2 className="font-semibold text-lg text-foreground mb-3">
                  Roteiro
                </h2>
                <div
                  className="rich-text-content text-sm text-muted-foreground leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: sanitize(tour.itinerary) }}
                />
              </section>
            )}

            {/* What to bring */}
            {tour.what_to_bring && (
              <section>
                <h2 className="font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
                  <Backpack className="w-5 h-5" />
                  O que levar
                </h2>
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                  <div
                    className="rich-text-content text-sm text-foreground leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: sanitize(tour.what_to_bring) }}
                  />
                </div>
              </section>
            )}

            {/* Boarding points */}
            <section>
              <h2 className="font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Pontos de embarque
              </h2>
              <TourBoardingPointsDisplay tourId={tour.id} departures={tour.departures} />
            </section>

            {/* Cancellation policy */}
            {tour.policy && (
              <section>
                <button
                  onClick={() => setPolicyOpen(!policyOpen)}
                  className="w-full flex items-center justify-between py-3 border-b border-border text-left"
                >
                  <span className="font-semibold text-foreground">
                    Política de cancelamento
                  </span>
                  {policyOpen ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
                {policyOpen && (
                  <div
                    className="pt-4 rich-text-content text-sm text-muted-foreground leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: sanitize(tour.policy) }}
                  />
                )}
              </section>
            )}

            {/* Related tours */}
            {relatedTours.length > 0 && (
              <section>
                <h2 className="font-semibold text-lg text-foreground mb-4">
                  Outras datas em {tour.city}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {relatedTours.map((related) => {
                    const relStart = new Date(related.start_date + "T12:00:00");
                    const relPrice =
                      related.pricing_options?.length > 0
                        ? Math.min(...related.pricing_options.map((o) => o.pix_price))
                        : related.valor_padrao || 0;
                    return (
                      <button
                        key={related.id}
                        onClick={() => navigate(`/passeio/${related.id}`)}
                        className="text-left p-4 rounded-xl border border-border hover:border-primary hover:shadow-sm transition-all"
                      >
                        <p className="font-medium text-sm text-foreground line-clamp-2 mb-1">
                          {related.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {relStart.getDate()} de {monthNames[relStart.getMonth()]} de {relStart.getFullYear()}
                        </p>
                        {relPrice > 0 && (
                          <p className="text-sm font-semibold text-primary mt-1">
                            {formatCurrency(relPrice)}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* Right column — sticky booking sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-card border border-border rounded-2xl shadow-md p-6 space-y-4">
              {/* Price */}
              {minPrice > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">A partir de</p>
                  <p className="text-3xl font-bold text-primary">
                    {formatCurrency(minPrice)}
                  </p>
                  <p className="text-xs text-muted-foreground">no PIX/à vista</p>
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
                        <span className="text-sm font-medium text-foreground">
                          {opt.option_name}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-primary">
                        {formatCurrency(opt.pix_price)}
                      </span>
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

              {/* WhatsApp */}
              <button
                onClick={() => {
                  const msg = `Olá! Gostaria de mais informações sobre: ${tour.name}`;
                  window.open(
                    `https://wa.me/5582993649454?text=${encodeURIComponent(msg)}`,
                    "_blank"
                  );
                }}
                className="w-full flex items-center justify-center gap-2 text-sm text-green-600 hover:text-green-700 transition-colors py-2"
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
                    {tour.city}, {tour.state}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Depoimentos */}
        {depoimentos.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              O que dizem nossos viajantes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          </div>
        )}

        {/* Bottom CTA */}
        {!isSoldOut && (
          <div className="mt-12 bg-primary rounded-2xl p-8 text-center text-primary-foreground">
            <h2 className="font-sans font-bold text-3xl md:text-4xl tracking-wide mb-2">
              Pronto para a aventura?
            </h2>
            <p className="text-primary-foreground/80 text-sm mb-6">
              Garanta sua vaga agora. As vagas são limitadas.
            </p>
            <Button
              variant="secondary"
              size="lg"
              className="bg-white text-primary hover:bg-white/90 font-semibold px-8"
              onClick={() => setReservaOpen(true)}
            >
              Reservar — {minPrice > 0 ? formatCurrency(minPrice) : "Consulte"}
            </Button>
          </div>
        )}
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
      <FloatingContactButton />
    </div>
  );
};

export default Passeio;
