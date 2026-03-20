import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Clock, Navigation } from "lucide-react";

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
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <div className="w-4 h-4 rounded-full bg-muted animate-pulse" />
        Carregando pontos de embarque...
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {boardingPoints.length > 0 && (
        <div className="space-y-1.5">
          {boardingPoints.map((point, index) => (
            <div 
              key={point.id} 
              className="relative flex items-start gap-2.5 p-2 border border-border rounded-lg"
            >
              {/* Timeline connector */}
              {index < boardingPoints.length - 1 && (
                <div className="absolute left-[17px] top-8 w-0.5 h-[calc(100%-8px)] bg-primary/20" />
              )}
              
              {/* Number badge */}
              <div className="relative z-10 flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex-shrink-0 shadow-sm">
                {index + 1}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <p className="text-[11px] font-semibold text-foreground leading-tight">
                    {point.nome}
                  </p>
                  {point.horario && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[9px] font-medium">
                      <Clock className="w-2.5 h-2.5" />
                      {point.horario}
                    </span>
                  )}
                </div>
                {point.endereco && (
                  <p className="flex items-start gap-1 text-[10px] text-muted-foreground leading-snug">
                    <Navigation className="w-2.5 h-2.5 mt-0.5 flex-shrink-0 opacity-60" />
                    {point.endereco}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {departures && (
        <div className="bg-muted/50 border border-border rounded-lg p-2.5">
          <h4 className="font-semibold text-[11px] text-foreground mb-1 flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-primary" />
            Informações Adicionais
          </h4>
          <div className="text-[10px] text-muted-foreground leading-relaxed whitespace-pre-line">
            {departures}
          </div>
        </div>
      )}
      
      {boardingPoints.length === 0 && !departures && (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground p-2 bg-muted/30 rounded-lg">
          <MapPin className="w-3.5 h-3.5 opacity-50" />
          Nenhuma informação de embarque disponível.
        </div>
      )}
    </div>
  );
}