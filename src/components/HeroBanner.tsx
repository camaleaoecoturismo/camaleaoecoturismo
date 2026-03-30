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
  title_font: string | null;
  title_font_size: string | null;
  subtitle_font: string | null;
  subtitle_font_size: string | null;
}

const GOOGLE_FONTS = ["Inter","Montserrat","Poppins","Raleway","Oswald","Bebas Neue","Playfair Display","Lora"];

// Tailwind classes para cada tamanho — título e subtítulo compartilham o mesmo map
const TITLE_SIZE_CLASSES: Record<string, string> = {
  "2xs": "text-sm md:text-2xl lg:text-3xl",
  "xs":  "text-base md:text-3xl lg:text-4xl",
  "sm":  "text-lg md:text-4xl lg:text-5xl",
  "md":  "text-xl md:text-5xl lg:text-6xl",
  "":    "text-2xl md:text-6xl lg:text-7xl",   // padrão
  "lg":  "text-3xl md:text-7xl lg:text-8xl",
  "xl":  "text-4xl md:text-8xl lg:text-9xl",
  "2xl": "text-5xl md:text-9xl lg:text-[10rem]",
  "3xl": "text-6xl md:text-[10rem] lg:text-[12rem]",
};

const SUBTITLE_SIZE_CLASSES: Record<string, string> = {
  "2xs": "text-xs md:text-sm",
  "xs":  "text-sm md:text-base",
  "sm":  "text-base md:text-lg",
  "md":  "text-base md:text-xl",
  "":    "text-lg md:text-2xl",               // padrão
  "lg":  "text-xl md:text-3xl",
  "xl":  "text-2xl md:text-4xl",
  "2xl": "text-3xl md:text-5xl",
  "3xl": "text-4xl md:text-6xl",
};

const FALLBACK_TITLE = "Reconecte-se com a natureza";
const FALLBACK_SUBTITLE = "Experimente a liberdade";
const FALLBACK_BTN = "Ver Passeios";
const AUTO_ADVANCE = 7000;

export function HeroBanner({ location = "hero" }: { location?: string }) {
  const navigate = useNavigate();
  const [slides, setSlides] = useState<HeroBannerSlide[]>([]);
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());

  useEffect(() => {
    const timeout = setTimeout(() => setLoaded(true), 4000);
    supabase
      .from("banners")
      .select("id, image_url, video_url, title, subtitle, button_text, button_url, order_index, title_font, title_font_size, subtitle_font, subtitle_font_size")
      .eq("is_active", true)
      .eq("location", location)
      .order("order_index")
      .then(({ data }) => {
        clearTimeout(timeout);
        if (data && data.length > 0) {
          setSlides(data as HeroBannerSlide[]);
          // Carrega Google Fonts necessárias
          const fonts = [...new Set(
            data.flatMap(s => [s.title_font, s.subtitle_font]).filter(Boolean)
          )] as string[];
          const googleFonts = fonts.filter(f => GOOGLE_FONTS.includes(f));
          if (googleFonts.length > 0) {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = `https://fonts.googleapis.com/css2?${googleFonts.map(f => `family=${encodeURIComponent(f)}:wght@400;700`).join("&")}&display=swap`;
            document.head.appendChild(link);
          }
        }
        setLoaded(true);
      })
      .catch(() => { clearTimeout(timeout); setLoaded(true); });
    return () => clearTimeout(timeout);
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
  if (!loaded) return <div className="h-[100svh] min-h-[600px] bg-black animate-pulse" />;

  // Para locations que não sejam hero, sem banner = sem renderizar nada
  if (hasFallback && location !== "hero") return null;

  if (hasFallback) {
    return (
      <section className="relative h-[100svh] min-h-[600px] flex items-end justify-center overflow-hidden">
        <img src="/hero.jpg" alt="Camaleão Ecoturismo" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-32 z-[1] bg-gradient-to-b from-black/50 to-transparent" />
        <div className="relative z-[2] text-center px-4 max-w-4xl mx-auto pb-20 md:pb-28">
          <h1 className="font-figtree text-2xl md:text-6xl lg:text-7xl font-bold text-white mb-1 leading-tight uppercase tracking-tight">
            {FALLBACK_TITLE}
          </h1>
          <p className="font-figtree text-white text-lg md:text-2xl mb-8 font-bold lowercase tracking-tight">{FALLBACK_SUBTITLE}</p>
          <button
            onClick={() => navigate("/agenda")}
            className="inline-flex items-center gap-2 bg-[#820AD1] hover:bg-[#6e09b0] text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors shadow-lg"
          >
            {FALLBACK_BTN} <ArrowRight className="h-4 w-4" />
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
          <div className="absolute inset-x-0 bottom-0 h-4/5 z-[1] bg-gradient-to-t from-black/95 via-black/65 to-transparent" />
          {/* Gradiente de cima para baixo (menu) */}
          <div className="absolute inset-x-0 top-0 h-32 z-[1] bg-gradient-to-b from-black/50 to-transparent" />

          {/* Conteúdo — ancorado no rodapé */}
          <div className="absolute inset-x-0 bottom-0 z-[2] flex flex-col items-center text-center px-4 pb-20 md:pb-28 max-w-4xl mx-auto left-0 right-0">
            {slide.title && (
              <h1
                className={`font-bold text-white mb-1 leading-tight uppercase tracking-tight ${TITLE_SIZE_CLASSES[slide.title_font_size || ""] ?? TITLE_SIZE_CLASSES[""]}`}
                style={slide.title_font ? { fontFamily: `'${slide.title_font}', sans-serif` } : { fontFamily: "Figtree, sans-serif" }}
              >
                {slide.title}
              </h1>
            )}
            {slide.subtitle && (
              <p
                className={`text-white mb-8 font-bold lowercase tracking-tight ${SUBTITLE_SIZE_CLASSES[slide.subtitle_font_size || ""] ?? SUBTITLE_SIZE_CLASSES[""]}`}
                style={slide.subtitle_font ? { fontFamily: `'${slide.subtitle_font}', sans-serif` } : { fontFamily: "Figtree, sans-serif" }}
              >
                {slide.subtitle}
              </p>
            )}
            {(slide.button_text || slide.button_url) && (
              <button
                onClick={() => handleBtn(slide)}
                className="inline-flex items-center gap-2 bg-[#820AD1] hover:bg-[#6e09b0] text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors shadow-lg"
              >
                {slide.button_text || "Ver Passeios"}
                <ArrowRight className="h-4 w-4" />
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
