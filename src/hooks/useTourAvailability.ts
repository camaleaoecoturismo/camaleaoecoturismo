// Hook to manage tour availability with realtime updates
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TourAvailability {
  tourId: string;
  totalSpots: number;
  availableSpots: number;
  isSoldOut: boolean;
}

export function useTourAvailability(tourId: string | undefined) {
  const [availability, setAvailability] = useState<TourAvailability | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAvailability = useCallback(async () => {
    if (!tourId) return;
    
    setLoading(true);
    try {
      // Get total spots and vagas_fechadas from tour
      const { data: tour } = await supabase
        .from('tours')
        .select('vagas, vagas_fechadas')
        .eq('id', tourId)
        .single();
      
      const totalSpots = tour?.vagas || 0;
      const vagasFechadas = tour?.vagas_fechadas || false;
      
      // Get available spots using the database function
      const { data: availableSpots, error } = await supabase.rpc('get_available_spots', {
        p_tour_id: tourId
      });

      if (error) {
        console.error('Error fetching availability:', error);
        return;
      }

      setAvailability({
        tourId,
        totalSpots,
        availableSpots: vagasFechadas ? 0 : (availableSpots || 0),
        isSoldOut: vagasFechadas || ((availableSpots || 0) <= 0 && totalSpots > 0)
      });
    } catch (err) {
      console.error('Error fetching availability:', err);
    } finally {
      setLoading(false);
    }
  }, [tourId]);

  // Fetch availability and subscribe to realtime changes
  useEffect(() => {
    fetchAvailability();
    
    if (!tourId) return;

    const toursChannel = supabase
      .channel(`tour-availability-${tourId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tours',
        filter: `id=eq.${tourId}`
      }, () => {
        fetchAvailability();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'reservas',
        filter: `tour_id=eq.${tourId}`
      }, () => {
        fetchAvailability();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(toursChannel);
    };
  }, [tourId, fetchAvailability]);

  return { availability, loading, refetch: fetchAvailability };
}

// Hook to check availability for multiple tours at once
export function useToursAvailability(tourIds: string[]) {
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, TourAvailability>>({});
  const [loading, setLoading] = useState(false);

  const fetchAllAvailability = useCallback(async () => {
    if (tourIds.length === 0) return;
    
    setLoading(true);
    try {
      const results: Record<string, TourAvailability> = {};
      
      // Fetch all tours' vagas in one query
      const { data: tours } = await supabase
        .from('tours')
        .select('id, vagas, vagas_fechadas')
        .in('id', tourIds);
      
      const toursMap = new Map((tours || []).map(t => [t.id, { vagas: t.vagas || 0, fechadas: t.vagas_fechadas || false }]));
      
      // Fetch availability for each tour
      await Promise.all(tourIds.map(async (tourId) => {
        const { data: availableSpots } = await supabase.rpc('get_available_spots', {
          p_tour_id: tourId
        });
        
        const tourData = toursMap.get(tourId) || { vagas: 0, fechadas: false };
        const totalSpots = tourData.vagas;
        const vagasFechadas = tourData.fechadas;
        results[tourId] = {
          tourId,
          totalSpots,
          availableSpots: vagasFechadas ? 0 : (availableSpots || 0),
          isSoldOut: vagasFechadas || ((availableSpots || 0) <= 0 && totalSpots > 0)
        };
      }));
      
      setAvailabilityMap(results);
    } catch (err) {
      console.error('Error fetching availability:', err);
    } finally {
      setLoading(false);
    }
  }, [tourIds.join(',')]);

  useEffect(() => {
    fetchAllAvailability();
  }, [fetchAllAvailability]);

  return { availabilityMap, loading, refetch: fetchAllAvailability };
}
