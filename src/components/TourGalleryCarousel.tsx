import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, CarouselApi } from '@/components/ui/carousel';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface GalleryImage {
  id: string;
  image_url: string;
  order_index: number;
  caption?: string;
}

interface TourGalleryCarouselProps {
  tourId: string;
  coverImage: string | null;
  tourName: string;
  isSoldOut?: boolean;
  /**
   * fill: fills parent container (used inside hero div).
   * Hides dots + count badge since hero overlay covers that area.
   */
  fill?: boolean;
}

export function TourGalleryCarousel({
  tourId,
  coverImage,
  tourName,
  isSoldOut = false,
  fill = false,
}: TourGalleryCarouselProps) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [modalApi, setModalApi] = useState<CarouselApi>();

  useEffect(() => {
    const fetchImages = async () => {
      const { data } = await supabase
        .from('tour_gallery_images')
        .select('id, image_url, order_index, caption')
        .eq('tour_id', tourId)
        .order('order_index');

      if (data && data.length > 0) {
        setImages(data);
      } else if (coverImage) {
        setImages([{ id: 'cover', image_url: coverImage, order_index: 0 }]);
      }
    };
    fetchImages();
  }, [tourId, coverImage]);

  useEffect(() => {
    if (modalApi) modalApi.scrollTo(lightboxIndex);
  }, [modalApi, lightboxIndex]);

  const onModalSelect = useCallback(() => {
    if (modalApi) setLightboxIndex(modalApi.selectedScrollSnap());
  }, [modalApi]);

  useEffect(() => {
    if (modalApi) {
      modalApi.on('select', onModalSelect);
      return () => { modalApi.off('select', onModalSelect); };
    }
  }, [modalApi, onModalSelect]);

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex(i => (i === 0 ? images.length - 1 : i - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex(i => (i === images.length - 1 ? 0 : i + 1));
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const renderLightbox = () => (
    <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 bg-black/95 border-0 overflow-hidden flex flex-col">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-50 text-white hover:bg-white/10"
          onClick={() => setLightboxOpen(false)}
        >
          <X className="w-5 h-5" />
        </Button>
        <div className="flex flex-col flex-1 pt-10 pb-4 overflow-hidden">
          <Carousel
            setApi={setModalApi}
            opts={{ startIndex: lightboxIndex, loop: true }}
            className="w-full flex-1"
          >
            <CarouselContent className="h-full">
              {images.map((image, index) => (
                <CarouselItem key={image.id} className="flex items-center justify-center">
                  <div className="flex flex-col items-center justify-center w-full px-4">
                    <img
                      src={image.image_url}
                      alt={`${tourName} - Foto ${index + 1}`}
                      className="max-h-[70vh] max-w-full w-auto h-auto object-contain rounded-lg"
                    />
                    {image.caption && (
                      <p className="text-white/90 text-sm mt-3 px-4 text-center max-w-xl">{image.caption}</p>
                    )}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2 bg-white/10 border-0 text-white hover:bg-white/20" />
            <CarouselNext className="right-2 bg-white/10 border-0 text-white hover:bg-white/20" />
          </Carousel>
          <div className="flex justify-center gap-2 mt-4 px-4 overflow-x-auto shrink-0">
            {images.map((image, index) => (
              <button
                key={image.id}
                className={`flex-shrink-0 w-16 h-12 rounded overflow-hidden border-2 transition-all ${index === lightboxIndex ? 'border-primary opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}
                onClick={() => setLightboxIndex(index)}
              >
                <img src={image.image_url} alt={`Miniatura ${index + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (images.length === 0) {
    if (fill) return <div className="absolute inset-0 bg-muted" />;
    return (
      <div className="relative aspect-[4/3] md:aspect-[16/9] bg-muted flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Sem fotos disponíveis</span>
      </div>
    );
  }

  const currentImage = images[currentIndex];
  const containerClass = fill
    ? 'absolute inset-0 overflow-hidden bg-muted'
    : 'relative aspect-[4/3] md:aspect-[16/9] overflow-hidden bg-muted';

  return (
    <>
      <div className={containerClass}>
        <img
          src={currentImage.image_url}
          alt={`${tourName} - Foto ${currentIndex + 1}`}
          className={`w-full h-full object-cover transition-opacity duration-500 ${isSoldOut ? 'grayscale opacity-80' : ''}`}
          onClick={() => fill ? undefined : openLightbox(currentIndex)}
          style={{ cursor: fill ? 'default' : 'zoom-in' }}
        />

        {/* Arrows — only if more than 1 image */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors z-30"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors z-30"
              aria-label="Próxima foto"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Dots — hidden in fill mode (covered by hero info) */}
            {!fill && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`rounded-full transition-all ${i === currentIndex ? 'w-4 h-2 bg-white' : 'w-2 h-2 bg-white/60'}`}
                    aria-label={`Ir para foto ${i + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Photo count — hidden in fill mode */}
            {!fill && (
              <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-md z-10 pointer-events-none">
                {currentIndex + 1} / {images.length}
              </div>
            )}

            {/* Count badge in fill mode — bottom right, above hero info */}
            {fill && (
              <button
                onClick={() => openLightbox(currentIndex)}
                className="absolute bottom-4 right-4 z-30 bg-black/50 hover:bg-black/70 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                </svg>
                {currentIndex + 1} / {images.length}
              </button>
            )}
          </>
        )}

        {/* Single image — click to open lightbox in fill mode */}
        {images.length === 1 && fill && (
          <button
            onClick={() => openLightbox(0)}
            className="absolute bottom-4 right-4 z-30 bg-black/50 hover:bg-black/70 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
            </svg>
            Ver foto
          </button>
        )}
      </div>

      {renderLightbox()}
    </>
  );
}
