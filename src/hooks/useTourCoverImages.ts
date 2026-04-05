import { useState, useEffect, useCallback, useRef } from 'react';
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

// Module-level cache — survives re-renders and re-mounts within the same session.
// null = fetched, no cover found (prevents redundant re-fetches).
const globalCache = new Map<string, TourCoverImage | null>();
let activeFetch: Promise<void> | null = null;

async function loadCovers(ids: string[]): Promise<void> {
  const missing = ids.filter(id => !globalCache.has(id));
  if (missing.length === 0) return;

  const { data } = await supabase
    .from('tour_gallery_images')
    .select('tour_id, image_url, crop_position')
    .in('tour_id', missing)
    .eq('is_cover', true);

  // Mark all requested IDs as fetched (null = no cover)
  missing.forEach(id => { if (!globalCache.has(id)) globalCache.set(id, null); });

  (data || []).forEach((img: any) => {
    const cropPosition: CropPosition = (img.crop_position as CropPosition) || { x: 50, y: 50, scale: 1 };
    globalCache.set(img.tour_id, { tourId: img.tour_id, imageUrl: img.image_url, cropPosition });
  });
}

export const useTourCoverImages = (tourIds: string[]) => {
  const key = tourIds.join(',');
  const [coverMap, setCoverMap] = useState<Map<string, TourCoverImage | null>>(() => new Map(globalCache));
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    const missing = tourIds.filter(id => !globalCache.has(id));
    if (missing.length === 0) {
      setCoverMap(new Map(globalCache));
      return;
    }

    fetchedRef.current = true;

    const run = async () => {
      // Deduplicate concurrent fetches across hook instances
      if (activeFetch) {
        await activeFetch;
      } else {
        activeFetch = loadCovers(tourIds).finally(() => { activeFetch = null; });
        await activeFetch;
      }
      setCoverMap(new Map(globalCache));
    };

    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const getCoverImage = useCallback((tourId: string): TourCoverImage | null => {
    return coverMap.get(tourId) ?? null;
  }, [coverMap]);

  return { getCoverImage };
};
