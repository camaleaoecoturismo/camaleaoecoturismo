import { memo, useState } from "react";
import { MapPin } from "lucide-react";
import { Tour } from "@/hooks/useTours";
import { WaitlistModal } from "@/components/WaitlistModal";
import { useTourAvailability } from "@/hooks/useTourAvailability";
import { useNavigate } from "react-router-dom";

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

function TourCardComponent({ tour, preloadedCover }: TourCardProps) {
  const navigate = useNavigate();
  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);
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
  const destName = tour.name.toUpperCase();
  const cityStateLabel = [tour.city, tour.state?.toUpperCase()].filter(Boolean).join(" - ");

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

  // Only show range if end day is different from start day
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

  return (
    <>
      <div
        className="group relative bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer"
        onClick={() => navigate(`/passeio/${tour.id}`)}
      >
        {/* Photo — outer wrapper allows date block to overflow */}
        <div className="relative">
          {/* Image container */}
          <div className="relative aspect-[4/3] overflow-hidden">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={tour.name}
                className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                  isSoldOut ? "brightness-75" : ""
                }`}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <MapPin className="w-12 h-12 text-primary/30" />
              </div>
            )}

            {/* Sold out overlay */}
            {isSoldOut && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-red-500 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-lg">
                  Vagas Esgotadas
                </span>
              </div>
            )}

            {/* Top gradient only */}
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/70 to-transparent z-[1]" />

            {/* Name + city/state — TOP LEFT */}
            <div className="absolute top-0 left-0 right-0 p-3 pr-20 z-[2]">
              <p className="text-white font-black text-lg md:text-xl leading-tight tracking-tight line-clamp-2 drop-shadow">
                {destName}
              </p>
              {cityStateLabel && (
                <p className="text-white/80 text-xs font-semibold mt-0.5 drop-shadow">
                  {cityStateLabel}
                </p>
              )}
            </div>

            {/* Etiqueta tags — BOTTOM LEFT */}
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
          </div>

          {/* Date block — half in photo, half in body */}
          <div className="absolute bottom-0 right-3 translate-y-1/2 z-10 bg-primary text-primary-foreground rounded-xl px-3 py-2 text-center shadow-lg min-w-[68px]">
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

        {/* Card Body */}
        <div className="px-3 pt-6 pb-3 space-y-1.5">
          {tour.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
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
              <button
                className="text-xs font-semibold text-orange-600 border border-orange-400 rounded-lg px-3 py-1.5 hover:bg-orange-50 transition-colors shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setWaitlistModalOpen(true);
                }}
              >
                Lista de espera
              </button>
            ) : (
              <span className="text-xs font-semibold text-primary shrink-0">
                Ver →
              </span>
            )}
          </div>
        </div>
      </div>

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
