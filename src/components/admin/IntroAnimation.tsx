import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface IntroAnimationProps {
  onComplete: () => void;
  logoUrl?: string | null;
}

export default function IntroAnimation({ onComplete }: IntroAnimationProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(true);
  const completedRef = useRef(false);

  const startExit = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setVisible(false);
    // Let the fade-out animation finish before calling onComplete
    setTimeout(onComplete, 500);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => startExit();
    video.addEventListener('ended', handleEnded);

    // Fallback: if video doesn't play or is very long, complete after 10s
    const fallback = setTimeout(startExit, 10000);

    video.play().catch(() => startExit());

    return () => {
      video.removeEventListener('ended', handleEnded);
      clearTimeout(fallback);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="intro"
          className="fixed inset-0 z-[9999] bg-white flex items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          <video
            ref={videoRef}
            src="/intro.mp4"
            muted
            playsInline
            className="max-w-full max-h-full"
            style={{ aspectRatio: '16/9', width: 'min(100vw, calc(100vh * 16 / 9))' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
