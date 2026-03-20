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
}

export function TourGalleryCarousel({
  tourId,
  coverImage,
  tourName,
  isSoldOut = false,
}: TourGalleryCarouselProps) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [modalApi, setModalApi] = useState<CarouselApi>();

  // Fetch all gallery images on mount
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

  // Sync lightbox carousel to selected index
  useEffect(() => {
    if (modalApi) {
      modalApi.scrollTo(lightboxIndex);
    }
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

  const handlePrev = () => {
    setCurrentIndex(i => (i === 0 ? images.length - 1 : i - 1));
  };

  const handleNext = () => {
    setCurrentIndex(i => (i === images.length - 1 ? 0 : i + 1));
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  if (images.length === 0) {
    return (
      <div className="relative aspect-[4/3] md:aspect-[16/9] bg-muted flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Sem fotos disponíveis</span>
      </div>
    );
  }

  const currentImage = images[currentIndex];

  return (
    <>
      <div className="relative aspect-[4/3] md:aspect-[16/9] overflow-hidden bg-muted">
        {/* Main image */}
        <img
          src={currentImage.image_url}
          alt={`${tourName} - Foto ${currentIndex + 1}`}
          className={`w-full h-full object-cover cursor-zoom-in transition-opacity duration-300 ${isSoldOut ? 'grayscale opacity-80' : ''}`}
          onClick={() => openLightbox(currentIndex)}
        />

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors z-10"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors z-10"
              aria-label="Próxima foto"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Dot indicators */}
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

            {/* Photo count badge */}
            <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-md z-10 pointer-events-none">
              {currentIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {/* Lightbox modal */}
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
                        <p className="text-white/90 text-sm mt-3 px-4 text-center max-w-xl">
                          {image.caption}
                        </p>
                      )}
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2 bg-white/10 border-0 text-white hover:bg-white/20" />
              <CarouselNext className="right-2 bg-white/10 border-0 text-white hover:bg-white/20" />
            </Carousel>

            {/* Thumbnail strip */}
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
    </>
  );
}
