import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PontoEmbarque {
  id: string;
  nome: string;
  endereco: string | null;
}

interface TourPontosEmbarqueDisplayProps {
  tourId: string;
  departures?: string | null;
}

export function TourPontosEmbarqueDisplay({ tourId, departures }: TourPontosEmbarqueDisplayProps) {
  const [pontosEmbarque, setPontosEmbarque] = useState<PontoEmbarque[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPontosEmbarque = async () => {
      try {
        const { data, error } = await supabase
          .from('pontos_embarque')
          .select(`
            id,
            nome,
            endereco,
            tour_pontos_embarque!inner(tour_id)
          `)
          .eq('tour_pontos_embarque.tour_id', tourId)
          .eq('ativo', true)
          .order('nome');

        if (error) throw error;
        setPontosEmbarque(data || []);
      } catch (error) {
        console.error('Error fetching pontos de embarque:', error);
      } finally {
        setLoading(false);
      }
    };

    if (tourId) {
      fetchPontosEmbarque();
    }
  }, [tourId]);

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">
        Carregando pontos de embarque...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pontosEmbarque.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm text-card-foreground mb-2 flex items-center">
            <MapPin className="w-3 h-3 mr-1" />
            Pontos de Embarque:
          </h4>
          <div className="space-y-2">
            {pontosEmbarque.map((ponto) => (
              <div key={ponto.id} className="flex items-start gap-2">
                <Badge variant="secondary" className="text-xs">
                  <MapPin className="w-3 h-3 mr-1" />
                  {ponto.nome}
                </Badge>
                {ponto.endereco && (
                  <span className="text-xs text-muted-foreground">
                    {ponto.endereco}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {departures && (
        <div>
          <h4 className="font-semibold text-sm text-card-foreground mb-2">
            Informações Adicionais:
          </h4>
          <div className="text-sm text-card-foreground leading-relaxed whitespace-pre-line">
            {departures}
          </div>
        </div>
      )}
      
      {pontosEmbarque.length === 0 && !departures && (
        <div className="text-sm text-muted-foreground">
          Nenhuma informação de embarque disponível.
        </div>
      )}
    </div>
  );
}