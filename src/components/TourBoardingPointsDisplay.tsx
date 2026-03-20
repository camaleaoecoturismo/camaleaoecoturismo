import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Clock } from "lucide-react";

interface TourBoardingPoint {
  id: string;
  nome: string;
  endereco: string | null;
  horario: string | null;
  order_index: number;
}

interface TourBoardingPointsDisplayProps {
  tourId: string;
  departures?: string | null;
}

export function TourBoardingPointsDisplay({
  tourId,
  departures
}: TourBoardingPointsDisplayProps) {
  const [boardingPoints, setBoardingPoints] = useState<TourBoardingPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchBoardingPoints = async () => {
      try {
        const { data, error } = await supabase
          .from('tour_boarding_points')
          .select('*')
          .eq('tour_id', tourId)
          .order('order_index');
        if (error) throw error;
        if (isMounted) {
          setBoardingPoints(data || []);
        }
      } catch (error) {
        console.error('Error fetching boarding points:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    if (tourId) {
      fetchBoardingPoints();
    }
    return () => {
      isMounted = false;
    };
  }, [tourId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-4 h-4 rounded-full bg-muted animate-pulse" />
        Carregando...
      </div>
    );
  }

  return (
    <div>
      {boardingPoints.length > 0 && (
        <div className="divide-y divide-border/50">
          {boardingPoints.map((point, index) => (
            <div key={point.id} className="flex items-start gap-3 py-2.5">
              {/* Number badge */}
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex-shrink-0 mt-0.5">
                {index + 1}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">{point.nome}</span>
                  {point.horario && (
                    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {point.horario}
                    </span>
                  )}
                </div>
                {point.endereco && (
                  <p className="text-xs text-muted-foreground mt-0.5">{point.endereco}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {departures && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Informações adicionais
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{departures}</p>
        </div>
      )}

      {boardingPoints.length === 0 && !departures && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 opacity-50" />
          Nenhuma informação de embarque disponível.
        </p>
      )}
    </div>
  );
}
