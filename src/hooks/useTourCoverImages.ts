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
  galleryCount: number;
}

// Global cache to prevent re-fetching
let globalCoverImagesCache: Map<string, TourCoverImage> | null = null;
let fetchPromise: Promise<Map<string, TourCoverImage>> | null = null;

export const useTourCoverImages = (tourIds: string[]) => {
  const [coverImages, setCoverImages] = useState<Map<string, TourCoverImage>>(
    globalCoverImagesCache || new Map()
  );
  const [loading, setLoading] = useState(!globalCoverImagesCache);

  const fetchCoverImages = useCallback(async () => {
    if (tourIds.length === 0) {
      setLoading(false);
      return;
    }

    // If we already have all the images cached, use them
    if (globalCoverImagesCache && tourIds.every(id => globalCoverImagesCache!.has(id))) {
      setCoverImages(globalCoverImagesCache);
      setLoading(false);
      return;
    }

    // If there's an ongoing fetch, wait for it
    if (fetchPromise) {
      const result = await fetchPromise;
      setCoverImages(result);
      setLoading(false);
      return;
    }

    // Start a new fetch
    fetchPromise = (async () => {
      // Fetch cover images
      const { data: coverData, error: coverError } = await supabase
        .from('tour_gallery_images')
        .select('tour_id, image_url, crop_position, is_cover')
        .in('tour_id', tourIds)
        .eq('is_cover', true);

      // Fetch gallery counts for all tours
      const { data: countData, error: countError } = await supabase
        .from('tour_gallery_images')
        .select('tour_id')
        .in('tour_id', tourIds);

      if (coverError) {
        console.error('Error fetching tour cover images:', coverError);
        return globalCoverImagesCache || new Map();
      }

      // Count images per tour
      const imageCounts = new Map<string, number>();
      countData?.forEach((img) => {
        imageCounts.set(img.tour_id, (imageCounts.get(img.tour_id) || 0) + 1);
      });

      const newCache = new Map(globalCoverImagesCache || []);
      
      coverData?.forEach((img) => {
        const cropPosition = (img.crop_position as unknown as CropPosition) || { x: 50, y: 50, scale: 1 };
        newCache.set(img.tour_id, {
          tourId: img.tour_id,
          imageUrl: img.image_url,
          cropPosition,
          galleryCount: imageCounts.get(img.tour_id) || 1,
        });
      });

      // Also set counts for tours without covers but with gallery images
      imageCounts.forEach((count, tourId) => {
        if (!newCache.has(tourId) && count > 0) {
          newCache.set(tourId, {
            tourId,
            imageUrl: '',
            cropPosition: { x: 50, y: 50, scale: 1 },
            galleryCount: count,
          });
        }
      });

      globalCoverImagesCache = newCache;
      return newCache;
    })();

    try {
      const result = await fetchPromise;
      setCoverImages(result);
    } finally {
      fetchPromise = null;
      setLoading(false);
    }
  }, [tourIds.join(',')]);

  useEffect(() => {
    fetchCoverImages();
  }, [fetchCoverImages]);

  const getCoverImage = useCallback((tourId: string): TourCoverImage | null => {
    return coverImages.get(tourId) || null;
  }, [coverImages]);

  return { coverImages, loading, getCoverImage };
};

// Clear cache on window unload to prevent stale data
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    globalCoverImagesCache = null;
  });
}
