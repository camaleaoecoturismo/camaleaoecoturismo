import { useEffect, useRef, useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export interface Story {
  id: string;
  title: string | null;
  caption: string | null;
  media_url: string;
  media_type: string;
  author_name: string | null;
  author_photo_url: string | null;
  cover_url?: string | null;
}

interface StoryModalProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
}

const IMAGE_DURATION = 5000; // ms
const TICK = 100; // ms

export function StoryModal({ stories, initialIndex, onClose }: StoryModalProps) {
  const [current, setCurrent] = useState(initialIndex);
  const [progress, setProgress] = useState(0); // 0–100
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef<number>(IMAGE_DURATION);
  const elapsedRef = useRef<number>(0);

  const story = stories[current];
  const isVideo = story.media_type === "video";

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const goNext = useCallback(() => {
    stopTimer();
    if (current < stories.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      onClose();
    }
  }, [current, stories.length, onClose]);

  const goPrev = useCallback(() => {
    stopTimer();
    if (current > 0) setCurrent((c) => c - 1);
  }, [current]);

  // Start progress timer when slide changes
  useEffect(() => {
    setProgress(0);
    elapsedRef.current = 0;

    if (isVideo) {
      // Wait for video metadata to get duration
      durationRef.current = IMAGE_DURATION; // fallback
    } else {
      durationRef.current = IMAGE_DURATION;
      timerRef.current = setInterval(() => {
        elapsedRef.current += TICK;
        const pct = Math.min((elapsedRef.current / durationRef.current) * 100, 100);
        setProgress(pct);
        if (pct >= 100) goNext();
      }, TICK);
    }

    return stopTimer;
  }, [current, isVideo, goNext]);

  // Video: use actual duration for progress
  const handleVideoLoaded = () => {
    const vid = videoRef.current;
    if (!vid) return;
    durationRef.current = (vid.duration || 10) * 1000;
    stopTimer();
    timerRef.current = setInterval(() => {
      elapsedRef.current += TICK;
      const pct = Math.min((elapsedRef.current / durationRef.current) * 100, 100);
      setProgress(pct);
      if (pct >= 100) goNext();
    }, TICK);
  };

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, goNext, goPrev]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-30 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        aria-label="Fechar"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Prev arrow */}
      {current > 0 && (
        <button
          onClick={goPrev}
          className="absolute left-2 md:left-6 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
          aria-label="Anterior"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Next arrow */}
      {current < stories.length - 1 && (
        <button
          onClick={goNext}
          className="absolute right-2 md:right-6 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
          aria-label="Próximo"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Story card — 9:16 on desktop, fullscreen on mobile */}
      <div className="relative w-full h-full md:w-auto md:h-[90vh] md:aspect-[9/16] md:rounded-2xl overflow-hidden bg-black shadow-2xl">

        {/* Progress bars */}
        <div className="absolute top-0 inset-x-0 z-20 flex gap-1 p-2">
          {stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{
                  width: i < current ? "100%" : i === current ? `${progress}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Author header */}
        {(story.author_name || story.author_photo_url) && (
          <div className="absolute top-6 inset-x-0 z-20 flex items-center gap-2.5 px-3 pt-2">
            {story.author_photo_url && (
              <div className="w-9 h-9 rounded-full ring-2 ring-[#820AD1] overflow-hidden shrink-0">
                <img src={story.author_photo_url} alt={story.author_name || ""} className="w-full h-full object-cover" />
              </div>
            )}
            {story.author_name && (
              <span className="text-white font-semibold text-sm drop-shadow">{story.author_name}</span>
            )}
          </div>
        )}

        {/* Media */}
        {isVideo ? (
          <video
            ref={videoRef}
            key={story.id}
            src={story.media_url}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            onLoadedMetadata={handleVideoLoaded}
            onEnded={goNext}
          />
        ) : (
          <img
            key={story.id}
            src={story.media_url}
            alt={story.title || ""}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Bottom gradient + caption */}
        {(story.caption || story.title) && (
          <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-16 pb-6 px-4">
            {story.title && (
              <p className="text-white font-bold text-base mb-1 leading-tight">{story.title}</p>
            )}
            {story.caption && (
              <p className="text-white/90 text-sm leading-snug">{story.caption}</p>
            )}
          </div>
        )}

        {/* Tap zones (mobile) */}
        <button
          className="absolute left-0 top-0 w-1/3 h-full z-10 opacity-0"
          onClick={goPrev}
          aria-label="Anterior"
        />
        <button
          className="absolute right-0 top-0 w-1/3 h-full z-10 opacity-0"
          onClick={goNext}
          aria-label="Próximo"
        />
      </div>
    </div>
  );
}
