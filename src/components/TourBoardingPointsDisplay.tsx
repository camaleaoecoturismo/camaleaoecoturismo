import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Clock, Map, Camera, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface BoardingPoint {
  id: string;
  nome: string;
  endereco: string | null;
  horario: string | null;
  maps_link: string | null;
  foto_url: string | null;
  order_index: number;
}

interface TourBoardingPointsDisplayProps {
  tourId: string;
  departures?: string | null;
}

const getMapsEmbedUrl = (mapsLink: string, endereco?: string | null): string => {
  try {
    const url = new URL(mapsLink);
    // Google Maps share/place URLs — use address as query for embed
    const query = endereco || url.searchParams.get('q') || mapsLink;
    return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed&hl=pt-BR`;
  } catch {
    const query = endereco || mapsLink;
    return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed&hl=pt-BR`;
  }
};

export function TourBoardingPointsDisplay({
  tourId,
  departures
}: TourBoardingPointsDisplayProps) {
  const [boardingPoints, setBoardingPoints] = useState<BoardingPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [fotoPopup, setFotoPopup] = useState<{ url: string; nome: string } | null>(null);
  const [mapsPopup, setMapsPopup] = useState<{ embedUrl: string; nome: string; mapsLink: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchBoardingPoints = async () => {
      try {
        // Try new system first: tour_pontos_embarque + pontos_embarque
        const { data: tpeData } = await supabase
          .from('tour_pontos_embarque')
          .select('horario, pontos_embarque(id, nome, endereco, maps_link, foto_url)')
          .eq('tour_id', tourId);

        if (tpeData && tpeData.length > 0) {
          const points: BoardingPoint[] = (tpeData as any[])
            .filter(l => l.pontos_embarque)
            .map((l, idx) => ({
              id: l.pontos_embarque.id,
              nome: l.pontos_embarque.nome,
              endereco: l.pontos_embarque.endereco,
              horario: l.horario,
              maps_link: l.pontos_embarque.maps_link,
              foto_url: l.pontos_embarque.foto_url,
              order_index: idx,
            }))
            .sort((a, b) => {
              if (!a.horario) return 1;
              if (!b.horario) return -1;
              return a.horario.localeCompare(b.horario);
            });

          if (isMounted) setBoardingPoints(points);
        } else {
          // Fallback to legacy system
          const { data, error } = await supabase
            .from('tour_boarding_points')
            .select('*')
            .eq('tour_id', tourId)
            .order('order_index');
          if (error) throw error;
          if (isMounted) setBoardingPoints((data || []) as unknown as BoardingPoint[]);
        }
      } catch (error) {
        console.error('Error fetching boarding points:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (tourId) fetchBoardingPoints();
    return () => { isMounted = false; };
  }, [tourId]);

  const openMapsPopup = (point: BoardingPoint) => {
    if (!point.maps_link) return;
    setMapsPopup({
      embedUrl: getMapsEmbedUrl(point.maps_link, point.endereco),
      nome: point.nome,
      mapsLink: point.maps_link,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-4 h-4 rounded-full bg-muted animate-pulse" />
        Carregando...
      </div>
    );
  }

  return (
    <>
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
                    <span className="text-sm font-medium text-gray-700">{point.nome}</span>
                    {point.horario && (
                      <span className="inline-flex items-center gap-0.5 text-sm text-gray-500">
                        <Clock className="w-3.5 h-3.5" />
                        {point.horario}
                      </span>
                    )}
                  </div>
                  {point.endereco && (
                    <p className="text-xs text-gray-500 mt-0.5">{point.endereco}</p>
                  )}
                  {/* Action buttons */}
                  {(point.maps_link || point.foto_url) && (
                    <div className="flex items-center gap-1.5 mt-1">
                      {point.maps_link && (
                        <button
                          type="button"
                          onClick={() => openMapsPopup(point)}
                          className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-1.5 py-1 rounded border border-blue-200 transition-colors"
                        >
                          <Map className="h-3 w-3" />
                          Ver no mapa
                        </button>
                      )}
                      {point.foto_url && (
                        <button
                          type="button"
                          onClick={() => setFotoPopup({ url: point.foto_url!, nome: point.nome })}
                          className="flex items-center gap-1 text-[10px] text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-1 rounded border border-emerald-200 transition-colors"
                        >
                          <Camera className="h-3 w-3" />
                          Ver foto
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {departures && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              Informações adicionais
            </p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{departures}</p>
          </div>
        )}

        {boardingPoints.length === 0 && !departures && (
          <p className="text-sm text-gray-500 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 opacity-50" />
            Nenhuma informação de embarque disponível.
          </p>
        )}
      </div>

      {/* Photo popup */}
      <Dialog open={!!fotoPopup} onOpenChange={(open) => { if (!open) setFotoPopup(null); }}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <div className="relative">
            <button
              onClick={() => setFotoPopup(null)}
              className="absolute top-2 right-2 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            {fotoPopup && (
              <>
                <img
                  src={fotoPopup.url}
                  alt={fotoPopup.nome}
                  className="w-full object-cover max-h-[70vh]"
                />
                <div className="px-4 py-3 bg-white">
                  <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {fotoPopup.nome}
                  </p>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Maps popup */}
      <Dialog open={!!mapsPopup} onOpenChange={(open) => { if (!open) setMapsPopup(null); }}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <div className="relative">
            <button
              onClick={() => setMapsPopup(null)}
              className="absolute top-2 right-2 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            {mapsPopup && (
              <>
                <div className="px-4 py-3 border-b bg-white flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {mapsPopup.nome}
                  </p>
                  <a
                    href={mapsPopup.mapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Abrir no Maps
                  </a>
                </div>
                <iframe
                  src={mapsPopup.embedUrl}
                  width="100%"
                  height="300"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  title={mapsPopup.nome}
                />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
