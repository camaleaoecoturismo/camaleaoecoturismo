import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar } from "lucide-react";
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  const formatDate = () => {
    const months = [
      "jan", "fev", "mar", "abr", "mai", "jun",
      "jul", "ago", "set", "out", "nov", "dez",
    ];
    const start = new Date(tour.start_date + "T12:00:00");
    const startStr = `${start.getDate()} ${months[start.getMonth()]}`;
    if (tour.end_date && tour.end_date !== tour.start_date) {
      const end = new Date(tour.end_date + "T12:00:00");
      const endMonth = months[end.getMonth()];
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()} – ${end.getDate()} ${endMonth}`;
      }
      return `${startStr} – ${end.getDate()} ${endMonth}`;
    }
    return startStr;
  };

  const imageUrl = preloadedCover?.imageUrl || tour.image_url;

  const handleCardClick = () => {
    navigate(`/passeio/${tour.id}`);
  };

  return (
    <>
      <div className="group relative bg-card rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow duration-200">
        {/* Photo */}
        <div
          className="relative aspect-[4/3] overflow-hidden cursor-pointer"
          onClick={handleCardClick}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={tour.name}
              className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                isSoldOut ? "opacity-60" : ""
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
            <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
              <span className="bg-red-500 text-white text-sm font-semibold px-4 py-1.5 rounded-full shadow-lg">
                Vagas Esgotadas
              </span>
            </div>
          )}

          {/* Featured badge */}
          {tour.is_featured && !isSoldOut && (
            <div className="absolute top-3 left-3 bg-yellow-400 text-yellow-900 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
              ⭐ Destaque
            </div>
          )}

          {/* Custom label */}
          {tour.etiqueta &&
            !isSoldOut &&
            tour.etiqueta !== "Histórico" &&
            tour.etiqueta !== "Vagas encerradas" &&
            tour.etiqueta !== "vagas encerradas" &&
            !tour.is_featured && (
              <div className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
                {tour.etiqueta}
              </div>
            )}

          {/* Date badge */}
          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
            <Calendar className="w-3 h-3 opacity-80 shrink-0" />
            {formatDate()}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4">
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
            {tour.city}, {tour.state}
          </p>
          <h3
            className="font-semibold text-foreground text-[15px] leading-snug mb-3 line-clamp-2 cursor-pointer hover:text-primary transition-colors"
            onClick={handleCardClick}
          >
            {tour.name}
          </h3>

          <div className="flex items-end justify-between gap-2">
            <div>
              {minPrice > 0 ? (
                <>
                  <p className="text-[10px] text-muted-foreground leading-none mb-0.5">
                    A partir de
                  </p>
                  <p className="text-lg font-bold text-primary leading-none">
                    {formatCurrency(minPrice)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Consulte</p>
              )}
            </div>

            {isSoldOut && isFutureTour ? (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 border-orange-400 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setWaitlistModalOpen(true);
                }}
              >
                Lista de espera
              </Button>
            ) : (
              <Button
                size="sm"
                className="text-xs h-8 bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
                onClick={handleCardClick}
              >
                Ver →
              </Button>
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
