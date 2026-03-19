import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, CarouselApi } from '@/components/ui/carousel';
import { ChevronLeft, ChevronRight, Images } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
interface CropPosition {
  x: number;
  y: number;
  scale: number;
}
interface GalleryImage {
  id: string;
  image_url: string;
  order_index: number;
  is_cover?: boolean;
  crop_position?: CropPosition;
  caption?: string;
}
interface TourGalleryCarouselProps {
  tourId: string;
  coverImage: string | null;
  tourName: string;
  isSoldOut?: boolean;
  onImageClick?: () => void;
  isExpanded?: boolean;
  // Pre-loaded cover image from batch fetch
  preloadedCover?: {
    imageUrl: string;
    cropPosition: CropPosition;
  } | null;
}

// Autoplay removed - only show cover image

export function TourGalleryCarousel({
  tourId,
  coverImage,
  tourName,
  isSoldOut = false,
  onImageClick,
  isExpanded = false,
  preloadedCover
}: TourGalleryCarouselProps) {
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryCount, setGalleryCount] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [expandedModalOpen, setExpandedModalOpen] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(0);
  const [modalApi, setModalApi] = useState<CarouselApi>();
  const [galleryFetched, setGalleryFetched] = useState(false);

  // Use pre-loaded cover if available, otherwise fallback
  const displayCoverImage = preloadedCover?.imageUrl || coverImage || '/placeholder.svg';
  const coverCropPosition = preloadedCover?.cropPosition || {
    x: 50,
    y: 50,
    scale: 1
  };

  // Fetch gallery count on mount (lightweight query just to show badge)
  useEffect(() => {
    const fetchGalleryCount = async () => {
      const { count, error } = await supabase
        .from('tour_gallery_images')
        .select('*', { count: 'exact', head: true })
        .eq('tour_id', tourId);
      
      if (!error && count !== null) {
        setGalleryCount(count);
      }
    };
    fetchGalleryCount();
  }, [tourId]);

  // All images for gallery display (sorted by order)
  const allImages = galleryImages.length > 0 ? galleryImages : [{
    id: 'cover',
    image_url: displayCoverImage,
    order_index: 0
  }];
  
  // Total count for badge display (use fetched count, or galleryImages if already loaded)
  const totalImageCount = galleryImages.length > 0 ? galleryImages.length : (galleryCount || 0);
  
  // Only fetch gallery images when modal is opened (lazy load)
  useEffect(() => {
    if (!expandedModalOpen || galleryFetched) return;
    
    const fetchGalleryImages = async () => {
      const {
        data,
        error
      } = await supabase.from('tour_gallery_images').select('*').eq('tour_id', tourId).order('order_index');
      if (!error && data) {
        const mappedData = data.map(img => ({
          ...img,
          crop_position: img.crop_position as unknown as CropPosition || {
            x: 50,
            y: 50,
            scale: 1
          }
        }));
        setGalleryImages(mappedData);
      }
      setGalleryFetched(true);
    };
    fetchGalleryImages();
  }, [tourId, expandedModalOpen, galleryFetched]);

  // Autoplay removed - only show cover image on cards

  // Sync modal carousel with expandedIndex
  useEffect(() => {
    if (modalApi && expandedModalOpen) {
      modalApi.scrollTo(expandedIndex);
    }
  }, [modalApi, expandedIndex, expandedModalOpen]);

  // Update expandedIndex when modal carousel changes
  const onModalSelect = useCallback(() => {
    if (modalApi) {
      setExpandedIndex(modalApi.selectedScrollSnap());
    }
  }, [modalApi]);
  useEffect(() => {
    if (modalApi) {
      modalApi.on('select', onModalSelect);
      return () => {
        modalApi.off('select', onModalSelect);
      };
    }
  }, [modalApi, onModalSelect]);
  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => prev === 0 ? allImages.length - 1 : prev - 1);
    setImageLoaded(false);
  };
  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => prev === allImages.length - 1 ? 0 : prev + 1);
    setImageLoaded(false);
  };
  const handleOpenGallery = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIndex(currentIndex);
    setExpandedModalOpen(true);
  };
  const handleImageAreaClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // If user clicks on the image area, expand the card info
    if (onImageClick) {
      onImageClick();
    }
  };
  const handleDotClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setCurrentIndex(index);
    setImageLoaded(false);
  };

  // Get current image for card display (use cover with crop, or first image)
  const currentCardImage = currentIndex === 0 ? {
    url: displayCoverImage,
    crop: coverCropPosition
  } : {
    url: allImages[currentIndex]?.image_url || displayCoverImage,
    crop: allImages[currentIndex]?.crop_position || {
      x: 50,
      y: 50,
      scale: 1
    }
  };

  // Stop event propagation for modal interactions
  const handleModalInteraction = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
  };
  return <>
      <div className="relative aspect-[3/1] overflow-hidden bg-muted group">
        {/* Loading state */}
        {!imageLoaded && !imageError && <div className="absolute inset-0 bg-muted animate-pulse" />}

        {/* Main image with crop position - clicking expands card info */}
        <img src={currentCardImage.url} alt={`${tourName} - Foto ${currentIndex + 1}`} className={`w-full h-full transition-all duration-300 cursor-pointer ${imageLoaded ? 'opacity-100' : 'opacity-0'} ${isSoldOut ? 'grayscale' : ''}`} style={{
        objectFit: 'cover',
        objectPosition: `${currentCardImage.crop.x}% ${currentCardImage.crop.y}%`,
        transform: `scale(${currentCardImage.crop.scale})`,
        transformOrigin: `${currentCardImage.crop.x}% ${currentCardImage.crop.y}%`
      }} loading="lazy" onClick={handleImageAreaClick} onLoad={() => setImageLoaded(true)} onError={() => {
        setImageError(true);
        setImageLoaded(true);
      }} />

        {imageError && <div className="w-full h-full absolute inset-0 bg-muted flex items-center justify-center">
            <span className="text-muted-foreground text-sm">Imagem não disponível</span>
          </div>}

        {/* Gallery badge/button - only show if there are gallery images */}
        {totalImageCount > 0 && <button data-tourcard-interactive="true" className={`absolute top-3 right-3 bg-black/60 text-white rounded-md flex items-center gap-1.5 cursor-pointer hover:bg-black/80 transition-colors z-10 ${isExpanded ? 'px-2.5 py-1.5' : 'px-2 py-1'}`} onClick={handleOpenGallery}>
            <Images className={isExpanded ? "w-4 h-4" : "w-3.5 h-3.5"} />
            <span className="text-xs font-medium">
              {isExpanded ? `Ver fotos (${totalImageCount})` : totalImageCount}
            </span>
          </button>}

        {/* Navigation arrows and dots removed - only show cover image */}
      </div>

      {/* Expanded modal - block swipe propagation */}
      <Dialog open={expandedModalOpen} onOpenChange={setExpandedModalOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 bg-black/95 border-0 overflow-hidden flex flex-col" onTouchStart={handleModalInteraction} onTouchMove={handleModalInteraction} onTouchEnd={handleModalInteraction}>
          <Button variant="ghost" size="icon" className="absolute top-2 right-2 z-50 text-white hover:bg-white/10" onClick={() => setExpandedModalOpen(false)}>
            
          </Button>

          <div className="flex flex-col flex-1 pt-10 pb-4 overflow-hidden" onTouchStart={handleModalInteraction} onTouchMove={handleModalInteraction} onTouchEnd={handleModalInteraction}>
            <Carousel setApi={setModalApi} opts={{
            startIndex: expandedIndex,
            loop: true
          }} className="w-full flex-1">
              <CarouselContent className="h-full">
                {allImages.map((image, index) => <CarouselItem key={image.id} className="flex items-center justify-center">
                    <div className="flex flex-col items-center justify-center w-full px-4">
                      {/* Full image without crop - contain mode to show full image */}
                      <img src={image.image_url} alt={`${tourName} - Foto ${index + 1}`} className="max-h-[70vh] max-w-full w-auto h-auto object-contain rounded-lg" />
                      {/* Caption */}
                      {image.caption && <p className="text-white/90 text-sm mt-3 px-4 text-center max-w-xl">
                          {image.caption}
                        </p>}
                    </div>
                  </CarouselItem>)}
              </CarouselContent>
              <CarouselPrevious className="left-2 bg-white/10 border-0 text-white hover:bg-white/20" />
              <CarouselNext className="right-2 bg-white/10 border-0 text-white hover:bg-white/20" />
            </Carousel>

            {/* Thumbnail strip */}
            <div className="flex justify-center gap-2 mt-4 px-4 overflow-x-auto shrink-0">
              {allImages.map((image, index) => <button key={image.id} className={`flex-shrink-0 w-16 h-12 rounded overflow-hidden border-2 transition-all ${index === expandedIndex ? 'border-primary opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`} onClick={() => setExpandedIndex(index)}>
                  <img src={image.image_url} alt={`Miniatura ${index + 1}`} className="w-full h-full object-cover" />
                </button>)}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>;
}