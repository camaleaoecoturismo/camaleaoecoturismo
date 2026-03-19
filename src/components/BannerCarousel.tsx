import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { type CarouselApi } from "@/components/ui/carousel";

interface Banner {
  id: string;
  image_url: string;
  link_url?: string;
  etiqueta?: string;
  order_index: number;
}

export function BannerCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    fetchBanners();
  }, []);

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  // Auto-play functionality - only if more than 1 banner
  useEffect(() => {
    if (!api || banners.length <= 1) return;

    const interval = setInterval(() => {
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0);
      }
    }, 7000);

    return () => clearInterval(interval);
  }, [api, banners.length]);

  const fetchBanners = async () => {
    const { data } = await supabase
      .from("banners")
      .select("*")
      .eq("is_active", true)
      .order("order_index");

    if (data) {
      setBanners(data);
    }
  };

  const handleBannerClick = (linkUrl?: string) => {
    if (linkUrl) {
      window.open(linkUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (banners.length === 0) return null;

  return (
    <div 
      className="w-full mb-1"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <Carousel setApi={setApi} className="relative w-full max-w-full">
        <CarouselContent className="-ml-0">
          {banners.map((banner) => (
            <CarouselItem key={banner.id} className="pl-0">
              <div className="relative overflow-hidden">
                {banner.etiqueta && (
                  <div className="absolute top-4 left-4 z-10">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground shadow-lg">
                      {banner.etiqueta}
                    </span>
                  </div>
                )}
                <div className="relative w-full" style={{ aspectRatio: '2048/414' }}>
                  <img
                    src={banner.image_url}
                    alt="Banner promocional"
                    className="w-full h-full object-contain"
                    width={2048}
                    height={414}
                    loading={banners.indexOf(banner) === 0 ? "eager" : "lazy"}
                    fetchPriority={banners.indexOf(banner) === 0 ? "high" : "auto"}
                  />
                  {banner.link_url && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBannerClick(banner.link_url);
                      }}
                      className="absolute bottom-4 right-4 bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors shadow-lg"
                    >
                      Clique aqui
                    </button>
                  )}
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        
        {banners.length > 1 && (
          <>
            <CarouselPrevious className="absolute left-4 top-4 z-20 bg-transparent hover:bg-transparent border-0 shadow-none">
              <ChevronLeft className="h-8 w-8 text-white" />
            </CarouselPrevious>
            <CarouselNext className="absolute right-4 top-4 z-20 bg-transparent hover:bg-transparent border-0 shadow-none">
              <ChevronRight className="h-8 w-8 text-white" />
            </CarouselNext>
            
            {/* Pagination dots */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex space-x-1 sm:space-x-2">
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => api?.scrollTo(index)}
                  className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-colors ${
                    index === current
                      ? "bg-white"
                      : "bg-white/50 hover:bg-white/75"
                  }`}
                  aria-label={`Ir para slide ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </Carousel>
    </div>
  );
}