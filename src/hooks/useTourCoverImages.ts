import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CropPosition {
  x: number;
  y: number;
  scale: number;
}

interface TourCoverImage {
  tourId: string;
  imageUrl: string;
  cropPosition: CropPosition;
}

// null = fetched but no cover found (prevents re-fetching)
type CacheEntry = TourCoverImage | null;

// Module-level cache — shared across all hook instances in the session
let globalCache: Map<string, CacheEntry> = new Map();
let pendingFetch: Promise<void> | null = null;

async function fetchCovers(ids: string[]): Promise<void> {
  // Only fetch IDs not yet in cache
  const missing = ids.filter(id => !globalCache.has(id));
  if (missing.length === 0) return;

  const { data } = await supabase
    .from('tour_gallery_images')
    .select('tour_id, image_url, crop_position')
    .in('tour_id', missing)
    .eq('is_cover', true);

  // Mark ALL missing IDs: those with covers get data, the rest get null
  missing.forEach(id => {
    if (!globalCache.has(id)) globalCache.set(id, null);
  });

  (data || []).forEach((img: any) => {
    const cropPosition: CropPosition = (img.crop_position as CropPosition) || { x: 50, y: 50, scale: 1 };
    globalCache.set(img.tour_id, { tourId: img.tour_id, imageUrl: img.image_url, cropPosition });
  });
}

export const useTourCoverImages = (tourIds: string[]) => {
  const [, forceUpdate] = useState(0);
  const [loading, setLoading] = useState(() => tourIds.some(id => !globalCache.has(id)));

  const load = useCallback(async () => {
    const missing = tourIds.filter(id => !globalCache.has(id));
    if (missing.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Deduplicate concurrent fetches
    if (pendingFetch) {
      await pendingFetch;
    } else {
      pendingFetch = fetchCovers(tourIds).finally(() => { pendingFetch = null; });
      await pendingFetch;
    }

    setLoading(false);
    forceUpdate(n => n + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourIds.join(',')]);

  useEffect(() => {
    load();
  }, [load]);

  const getCoverImage = useCallback((tourId: string): TourCoverImage | null => {
    return globalCache.get(tourId) ?? null;
  }, []);

  return { loading, getCoverImage };
};

// Reset cache on page unload to avoid serving stale data after deploys
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => { globalCache = new Map(); });
}
