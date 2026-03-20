import { memo, useState } from "react";
import { MapPin, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Tour } from "@/hooks/useTours";
import { WaitlistModal } from "@/components/WaitlistModal";
import { useTourAvailability } from "@/hooks/useTourAvailability";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TourCardProps {
  tour: Tour;
  onMoreInfo?: (tourId: string) => void;
  onReservar?: (tour: Tour) => void;
  isExpanded?: boolean;
  onToggleExpand?: (tourId: string) => void;
  preloadedCover?: {
    imageUrl: string;
    cropPosition: { x: number; y: number; scale: number };
  } | null;
}

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MONTH_NAMES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

function TourCardComponent({ tour, preloadedCover }: TourCardProps) {
  const navigate = useNavigate();
  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);
  const [showNextDates, setShowNextDates] = useState(false);
  const [nextDatesModalOpen, setNextDatesModalOpen] = useState(false);
  const [nextDates, setNextDates] = useState<Tour[]>([]);
  const [nextDateCovers, setNextDateCovers] = useState<Map<string, string>>(new Map());
  const [loadingNextDates, setLoadingNextDates] = useState(false);

  const isDesktop = () => window.matchMedia("(min-width: 768px)").matches;
  const { availability } = useTourAvailability(tour.id);

  const isSoldOut =
    availability?.isSoldOut ||
    tour.vagas_fechadas ||
    tour.etiqueta === "Vagas encerradas" ||
    tour.etiqueta === "vagas encerradas";

  const tourStartDate = new Date(tour.start_date + "T12:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isFutureTour = tourStartDate >= today;

  const minPrice =
    tour.pricing_options?.length > 0
      ? Math.min(...tour.pricing_options.map((o) => o.pix_price))
      : tour.valor_padrao || 0;

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const imageUrl = preloadedCover?.imageUrl || tour.image_url;

  // Use explicit text fields if set, otherwise auto-split: all but last word = prefix
  const nameWords = tour.name.toUpperCase().split(" ");
  const namePrefix = tour.card_name_prefix
    ? tour.card_name_prefix.toUpperCase()
    : nameWords.length > 1 ? nameWords.slice(0, -1).join(" ") : null;
  const nameMain = tour.card_name_main
    ? tour.card_name_main.toUpperCase()
    : nameWords[nameWords.length - 1];

  const cityStateLabel = [tour.city, tour.state?.toUpperCase()].filter(Boolean).join(" - ");

  const PREFIX_SIZES: Record<string, string> = {
    xs: "text-[11px]", sm: "text-xs", base: "text-sm",
  };
  const MAIN_SIZES: Record<string, string> = {
    xl: "text-xl", "2xl": "text-2xl md:text-3xl", "3xl": "text-3xl md:text-4xl", "4xl": "text-4xl md:text-5xl",
  };
  const prefixSizeClass = PREFIX_SIZES[tour.card_prefix_size ?? "xs"] ?? "text-[11px]";
  const mainSizeClass = MAIN_SIZES[tour.card_main_size ?? "2xl"] ?? "text-2xl md:text-3xl";

  // Date block values
  const monthAbbr = tourStartDate
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "")
    .toUpperCase();
  const startDay = tourStartDate.getDate();
  const endDate = tour.end_date ? new Date(tour.end_date + "T12:00:00") : null;
  const endDay = endDate ? endDate.getDate() : null;
  const startWeekday = WEEKDAYS[tourStartDate.getDay()];
  const endWeekday = endDate ? WEEKDAYS[endDate.getDay()] : null;

  const dayRange =
    endDay && endDay !== startDay ? `${startDay} à ${endDay}` : `${startDay}`;
  const weekdayRange =
    endWeekday && endWeekday !== startWeekday
      ? `${startWeekday} à ${endWeekday}`
      : startWeekday;

  const showEtiqueta =
    tour.etiqueta &&
    tour.etiqueta !== "Histórico" &&
    tour.etiqueta !== "Vagas encerradas" &&
    tour.etiqueta !== "vagas encerradas";

  const fetchNextDatesData = async () => {
    if (nextDates.length > 0) return;
    setLoadingNextDates(true);
    const todayStr = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("tours")
      .select("*, pricing_options:tour_pricing_options(id, option_name, pix_price, card_price)")
      .eq("city", tour.city)
      .eq("is_active", true)
      .neq("id", tour.id)
      .gte("start_date", todayStr)
      .order("start_date", { ascending: true })
      .limit(10);
    const list = (data as Tour[]) || [];
    setNextDates(list);
    if (list.length > 0) {
      const ids = list.map(t => t.id);
      const { data: covers } = await supabase
        .from('tour_gallery_images')
        .select('tour_id, image_url')
        .in('tour_id', ids)
        .eq('is_cover', true);
      if (covers) {
        const m = new Map<string, string>();
        covers.forEach(c => m.set(c.tour_id, c.image_url));
        setNextDateCovers(m);
      }
    }
    setLoadingNextDates(false);
  };

  const handleNextDates = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDesktop()) {
      await fetchNextDatesData();
      setNextDatesModalOpen(true);
    } else {
      if (showNextDates) {
        setShowNextDates(false);
        return;
      }
      await fetchNextDatesData();
      setShowNextDates(true);
    }
  };

  return (
    <>
      <div
        className="group relative bg-card rounded-xl overflow-hidden border border-border [box-shadow:0_0_12px_3px_rgba(0,0,0,0.10)] hover:[box-shadow:0_0_24px_6px_rgba(0,0,0,0.16)] transition-all duration-200 cursor-pointer"
        onClick={() => navigate(`/passeio/${tour.slug || tour.id}`)}
      >
        {/* Photo */}
        <div className="relative">
          <div className="relative aspect-[4/3] overflow-hidden">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={tour.name}
                className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                  ""
                }`}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <MapPin className="w-12 h-12 text-primary/30" />
              </div>
            )}

            {/* Sold out badge */}
            {isSoldOut && (
              <div className="absolute bottom-2.5 left-2.5 z-[2]">
                <span className="bg-red-600 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md tracking-wide">
                  Esgotado
                </span>
              </div>
            )}

            {/* Top gradient */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-[1]" />

            {/* Name + city — TOP LEFT */}
            <div className="absolute top-0 left-0 right-0 p-3 pr-20 z-[2]">
              {namePrefix && (
                <p className={`text-white ${prefixSizeClass} font-semibold tracking-widest drop-shadow leading-none mb-0.5 uppercase`}>
                  {namePrefix}
                </p>
              )}
              <p className={`text-white font-montserrat font-black ${mainSizeClass} leading-none drop-shadow-md tracking-tight`}>
                {nameMain}
              </p>
              {cityStateLabel && (
                <p className="text-white/70 text-[11px] font-medium mt-0.5 drop-shadow">
                  {cityStateLabel}
                </p>
              )}
            </div>

            {/* Etiqueta — BOTTOM LEFT */}
            {(showEtiqueta || tour.is_featured) && (
              <div className="absolute bottom-0 left-0 p-3 flex flex-wrap gap-1.5 z-[2]">
                {tour.is_featured && (
                  <span className="bg-yellow-400 text-yellow-900 text-[11px] font-bold px-2.5 py-1 rounded-md leading-none">
                    ⭐ DESTAQUE
                  </span>
                )}
                {showEtiqueta && (
                  <span className="bg-primary text-primary-foreground text-[11px] font-bold px-2.5 py-1 rounded-md leading-none uppercase tracking-wide">
                    {tour.etiqueta}
                  </span>
                )}
              </div>
            )}

            {/* Date block — BOTTOM RIGHT inside photo */}
            <div className="absolute bottom-3 right-3 z-[2] bg-primary/90 backdrop-blur-sm text-primary-foreground rounded-xl px-3 py-2 text-center shadow-lg min-w-[64px]">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 leading-none mb-1">
                {monthAbbr}
              </p>
              <p className="text-base font-black leading-tight whitespace-nowrap">
                {dayRange}
              </p>
              <p className="text-[10px] font-medium opacity-80 leading-none mt-0.5 whitespace-nowrap">
                {weekdayRange}
              </p>
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="px-3 pt-3 pb-3 space-y-1.5">
          {tour.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {tour.description}
            </p>
          )}

          <div className="flex items-end justify-between gap-2">
            {minPrice > 0 ? (
              <div>
                <p className="text-[10px] text-muted-foreground leading-none mb-0.5">
                  A partir de
                </p>
                <p className="text-base font-bold text-foreground leading-none">
                  {formatCurrency(minPrice)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Consulte</p>
            )}

            {isSoldOut && isFutureTour ? (
              <div className="flex flex-row md:flex-col gap-1.5 shrink-0">
                <button
                  className="text-xs font-semibold text-orange-600 border border-orange-400 rounded-lg px-2.5 py-1.5 hover:bg-orange-50 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setWaitlistModalOpen(true);
                  }}
                >
                  Lista de espera
                </button>
                <button
                  className={`text-xs font-semibold border rounded-lg px-2.5 py-1.5 transition-colors flex items-center gap-1 ${
                    showNextDates
                      ? "bg-primary text-primary-foreground border-primary"
                      : "text-primary border-primary hover:bg-primary/10"
                  }`}
                  onClick={handleNextDates}
                >
                  {loadingNextDates ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : showNextDates ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                  Próximas datas
                </button>
              </div>
            ) : (
              <span className="text-xs font-semibold text-primary shrink-0">
                Ver →
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Próximas datas — expandable panel below card */}
      {showNextDates && (
        <div
          className="border border-border border-t-0 rounded-b-2xl bg-card px-3 pt-3 pb-4 -mt-2"
          onClick={(e) => e.stopPropagation()}
        >
          {nextDates.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              Nenhuma data futura disponível para essa cidade.
            </p>
          ) : (
            <div className="flex overflow-x-auto gap-3 pb-1 snap-x -mx-1 px-1">
              {nextDates.map((related) => {
                const relStart = new Date(related.start_date + "T12:00:00");
                const relEnd = related.end_date ? new Date(related.end_date + "T12:00:00") : null;
                const relDays = relEnd
                  ? Math.ceil((relEnd.getTime() - relStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
                  : 1;
                const relPrice =
                  related.pricing_options?.length > 0
                    ? Math.min(...related.pricing_options.map((o) => o.pix_price))
                    : related.valor_padrao || 0;
                return (
                  <button
                    key={related.id}
                    onClick={() => navigate(`/passeio/${related.slug || related.id}`)}
                    className="w-40 shrink-0 snap-start text-left rounded-xl border border-border overflow-hidden hover:border-primary hover:shadow-sm transition-all bg-background"
                  >
                    {(nextDateCovers.get(related.id) || related.image_url) && (
                      <div className="aspect-[4/3] overflow-hidden">
                        <img
                          src={nextDateCovers.get(related.id) || related.image_url!}
                          alt={related.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="p-2.5 space-y-0.5">
                      <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
                        {related.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {relStart.getDate()} de {MONTH_NAMES[relStart.getMonth()]}
                        {relDays > 1 ? ` · ${relDays} dias` : ""}
                      </p>
                      {relPrice > 0 && (
                        <p className="text-xs font-bold text-primary">
                          {relPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 })}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Próximas datas — desktop modal */}
      <Dialog open={nextDatesModalOpen} onOpenChange={setNextDatesModalOpen}>
        <DialogContent className="max-w-lg" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Próximas datas — {tour.city}
            </DialogTitle>
          </DialogHeader>
          {loadingNextDates ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : nextDates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma data futura disponível para essa cidade.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {nextDates.map((related) => {
                const relStart = new Date(related.start_date + "T12:00:00");
                const relEnd = related.end_date ? new Date(related.end_date + "T12:00:00") : null;
                const relDays = relEnd
                  ? Math.ceil((relEnd.getTime() - relStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
                  : 1;
                const relPrice =
                  related.pricing_options?.length > 0
                    ? Math.min(...related.pricing_options.map((o) => o.pix_price))
                    : related.valor_padrao || 0;
                return (
                  <button
                    key={related.id}
                    onClick={() => { setNextDatesModalOpen(false); navigate(`/passeio/${related.slug || related.id}`); }}
                    className="text-left rounded-xl border border-border overflow-hidden hover:border-primary hover:shadow-sm transition-all bg-background"
                  >
                    {(nextDateCovers.get(related.id) || related.image_url) && (
                      <div className="aspect-[4/3] overflow-hidden">
                        <img
                          src={nextDateCovers.get(related.id) || related.image_url!}
                          alt={related.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="p-2.5 space-y-0.5">
                      <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
                        {related.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {relStart.getDate()} de {MONTH_NAMES[relStart.getMonth()]}
                        {relDays > 1 ? ` · ${relDays} dias` : ""}
                      </p>
                      {relPrice > 0 && (
                        <p className="text-xs font-bold text-primary">
                          {relPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 })}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <WaitlistModal
        open={waitlistModalOpen}
        onOpenChange={setWaitlistModalOpen}
        tourId={tour.id}
        tourName={tour.name}
      />
    </>
  );
}

export const TourCard = memo(TourCardComponent);
