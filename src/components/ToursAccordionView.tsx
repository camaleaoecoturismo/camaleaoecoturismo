import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Tour } from "@/hooks/useTours";
import { TourListItem } from "./TourListItem";
import { motion, AnimatePresence } from "framer-motion";

interface MonthData {
  id: string;
  label: string;
  name: string;
  month: string;
  year: number;
}

interface ToursAccordionViewProps {
  months: MonthData[];
  tours: Tour[];
  onMoreInfo: (tourId: string) => void;
  onReservar: (tour: Tour) => void;
  onWaitlist: (tour: Tour) => void;
}

export function ToursAccordionView({ 
  months, 
  tours, 
  onMoreInfo, 
  onReservar, 
  onWaitlist 
}: ToursAccordionViewProps) {
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const getToursForMonth = (monthId: string) => {
    const [month, yearStr] = monthId.split("-");
    const year = parseInt(yearStr);
    return tours.filter(tour => {
      if (!tour.is_active || !tour.start_date || tour.is_exclusive) return false;
      const tourDate = new Date(tour.start_date + 'T12:00:00');
      const tourYear = tourDate.getFullYear();
      return tour.month === month && tourYear === year;
    });
  };

  const toggleMonth = (monthId: string) => {
    setExpandedMonth(prev => prev === monthId ? null : monthId);
  };

  return (
    <div className="divide-y divide-white/10">
      {months.map((month) => {
        const monthTours = getToursForMonth(month.id);
        const isExpanded = expandedMonth === month.id;
        
        return (
          <div key={month.id}>
            {/* Month Header */}
            <button
              onClick={() => toggleMonth(month.id)}
              className="w-full flex items-center justify-between py-3 px-2 hover:bg-gray-50 transition-colors group"
            >
              <span className="text-lg font-bold text-primary group-hover:text-primary/80 transition-colors">
                {month.name}
              </span>
              <ChevronDown 
                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                  isExpanded ? "rotate-180" : ""
                }`} 
              />
            </button>

            {/* Expanded Content */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="pb-3 px-2 space-y-0.5">
                    {monthTours.length === 0 ? (
                      <p className="text-sm text-gray-400 py-2">
                        Nenhum passeio disponível.
                      </p>
                    ) : (
                      monthTours.map((tour) => (
                        <TourListItem
                          key={tour.id}
                          tour={tour}
                          onMoreInfo={onMoreInfo}
                          onReservar={onReservar}
                          onWaitlist={onWaitlist}
                        />
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
