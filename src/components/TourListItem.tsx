import React, { memo } from "react";
import { ChevronRight } from "lucide-react";
import { Tour } from "@/hooks/useTours";
import { useTourAvailability } from "@/hooks/useTourAvailability";

interface TourListItemProps {
  tour: Tour;
  onMoreInfo?: (tourId: string) => void;
  onReservar?: (tour: Tour) => void;
  onWaitlist?: (tour: Tour) => void;
}

function TourListItemComponent({ tour, onMoreInfo, onReservar, onWaitlist }: TourListItemProps) {
  const { availability } = useTourAvailability(tour.id);

  // Check sold out status
  const isSoldOutFromAvailability = availability?.isSoldOut ?? false;
  const isSoldOutFromVagasFechadas = (tour as any).vagas_fechadas === true;
  const isSoldOutFromEtiqueta = tour.etiqueta === "Vagas encerradas" || tour.etiqueta === "vagas encerradas";
  const isSoldOut = isSoldOutFromAvailability || isSoldOutFromVagasFechadas || isSoldOutFromEtiqueta;

  const formatDateBadge = () => {
    const monthNames = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
    const startDate = new Date(tour.start_date + "T12:00:00");
    const month = monthNames[startDate.getMonth()];
    const day = startDate.getDate();
    
    if (tour.end_date && tour.end_date !== tour.start_date) {
      const endDate = new Date(tour.end_date + "T12:00:00");
      const endDay = endDate.getDate();
      return { month, days: `${day}-${endDay}` };
    }
    
    return { month, days: String(day) };
  };

  const handleClick = () => {
    if (isSoldOut && onWaitlist) {
      onWaitlist(tour);
    } else if (onReservar) {
      onReservar(tour);
    }
  };

  const dateInfo = formatDateBadge();

  return (
    <div
      onClick={handleClick}
      className={`group flex items-center gap-3 py-2 hover:bg-gray-50 transition-all cursor-pointer rounded ${isSoldOut ? "opacity-50" : ""}`}
    >
      {/* Date Badge - Purple rectangle like the card */}
      <div className="flex-shrink-0 bg-primary text-primary-foreground px-3 py-1.5 rounded text-center min-w-[50px]">
        <div className="text-[10px] font-medium leading-tight">{dateInfo.month}</div>
        <div className="text-sm font-bold leading-tight">{dateInfo.days}</div>
      </div>

      {/* Tour Name */}
      <span className="flex-1 text-sm text-gray-800 truncate group-hover:text-primary transition-colors">
        {tour.name}
      </span>

      {/* Arrow */}
      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors flex-shrink-0" />
    </div>
  );
}

export const TourListItem = memo(TourListItemComponent);
