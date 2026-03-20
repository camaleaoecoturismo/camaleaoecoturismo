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
  const stateAbbr = tour.state?.toUpperCase() || "";

  // Etiqueta: show unless it's a control value
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
        {/* Photo with overlay */}
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

          {/* Gradient bottom only — for name legibility */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/65 to-transparent" />

          {/* Name + state + tags — BOTTOM LEFT */}
          <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1.5">
            {(showEtiqueta || tour.is_featured) && (
              <div className="flex flex-wrap gap-1.5">
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
            <p className="text-white font-black text-xl md:text-2xl leading-tight tracking-tight drop-shadow-sm">
              {destName}
              {stateAbbr && (
                <span className="text-white/75 font-semibold text-sm ml-1.5 align-middle">
                  {stateAbbr}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 space-y-3">
          {/* Description */}
          {tour.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {tour.description}
            </p>
          )}

          {/* Price + action */}
          <div className="flex items-end justify-between gap-2 pt-1">
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
