import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface HeroBannerSlide {
  id: string;
  image_url: string | null;
  video_url: string | null;
  title: string | null;
  subtitle: string | null;
  button_text: string | null;
  button_url: string | null;
  order_index: number;
}

const FALLBACK_TITLE = "Reconecte-se com a natureza";
const FALLBACK_SUBTITLE = "Experimente a liberdade";
const FALLBACK_BTN = "Ver Passeios";
const AUTO_ADVANCE = 7000;

export function HeroBanner() {
  const navigate = useNavigate();
  const [slides, setSlides] = useState<HeroBannerSlide[]>([]);
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());

  useEffect(() => {
    supabase
      .from("banners")
      .select("id, image_url, video_url, title, subtitle, button_text, button_url, order_index")
      .eq("is_active", true)
      .eq("location", "hero")
      .order("order_index")
      .then(({ data }) => {
        if (data && data.length > 0) setSlides(data as HeroBannerSlide[]);
        setLoaded(true);
      });
  }, []);

  const go = useCallback((idx: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrent(idx);
  }, []);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Auto-advance
  useEffect(() => {
    if (slides.length <= 1) return;
    timerRef.current = setInterval(next, AUTO_ADVANCE);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [slides.length, next]);

  // Play/pause videos on slide change
  useEffect(() => {
    videoRefs.current.forEach((video, idx) => {
      if (idx === current) {
        video.currentTime = 0;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [current]);

  const handleBtn = (slide: HeroBannerSlide) => {
    const url = slide.button_url || "/agenda";
    if (url.startsWith("http")) window.open(url, "_blank", "noopener,noreferrer");
    else navigate(url);
  };

  // Fallback: no slides yet
  const hasFallback = loaded && slides.length === 0;
  if (!loaded) return <div className="h-screen bg-black" />;

  if (hasFallback) {
    return (
      <section className="relative h-[100svh] min-h-[600px] flex items-end justify-center overflow-hidden">
        <img src="/hero.jpg" alt="Camaleão Ecoturismo" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto pb-20 md:pb-28">
          <h1 className="font-playfair text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 leading-tight">
            {FALLBACK_TITLE}
          </h1>
          <p className="font-playfair italic text-white/80 text-xl md:text-2xl mb-8">{FALLBACK_SUBTITLE}</p>
          <button
            onClick={() => navigate("/agenda")}
            className="inline-flex items-center gap-2 bg-[#820AD1] hover:bg-[#6e09b0] text-white font-semibold text-base px-8 py-4 rounded-full transition-colors shadow-lg"
          >
            {FALLBACK_BTN} <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="relative h-[100svh] min-h-[600px] overflow-hidden">
      {/* Slides */}
      {slides.map((slide, idx) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-700 ${idx === current ? "opacity-100 z-10" : "opacity-0 z-0"}`}
        >
          {/* Background: video ou imagem */}
          {slide.video_url ? (
            <video
              ref={(el) => { if (el) videoRefs.current.set(idx, el); else videoRefs.current.delete(idx); }}
              src={slide.video_url}
              autoPlay={idx === 0}
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : slide.image_url ? (
            <img
              src={slide.image_url}
              alt={slide.title || "Banner"}
              className="absolute inset-0 w-full h-full object-cover"
              loading={idx === 0 ? "eager" : "lazy"}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#820AD1] to-[#1a0533]" />
          )}

          {/* Gradiente de baixo para cima */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

          {/* Conteúdo — ancorado no rodapé */}
          <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center text-center px-4 pb-20 md:pb-28 max-w-4xl mx-auto left-0 right-0">
            {slide.title && (
              <h1 className="font-playfair text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 leading-tight">
                {slide.title}
              </h1>
            )}
            {slide.subtitle && (
              <p className="font-playfair italic text-white/80 text-xl md:text-2xl mb-8">
                {slide.subtitle}
              </p>
            )}
            {(slide.button_text || slide.button_url) && (
              <button
                onClick={() => handleBtn(slide)}
                className="inline-flex items-center gap-2 bg-[#820AD1] hover:bg-[#6e09b0] text-white font-semibold text-base px-8 py-4 rounded-full transition-colors shadow-lg"
              >
                {slide.button_text || "Ver Passeios"}
                <ArrowRight className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Setas de navegação */}
      {slides.length > 1 && (
        <>
          <button
            onClick={() => { prev(); go((current - 1 + slides.length) % slides.length); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm flex items-center justify-center text-white transition-colors"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={() => { next(); go((current + 1) % slides.length); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm flex items-center justify-center text-white transition-colors"
            aria-label="Próximo"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => go(idx)}
                className={`rounded-full transition-all duration-300 ${idx === current ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/40 hover:bg-white/70"}`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
