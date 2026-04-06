import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface IntroAnimationProps {
  onComplete: () => void;
  logoUrl?: string | null;
}

// ─── Synthesized intro sound (Web Audio API) ──────────────────────────────────
function playIntroSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const play = (freq: number, startAt: number, duration: number, peakGain: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const compressor = ctx.createDynamicsCompressor();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startAt);

      gain.gain.setValueAtTime(0, ctx.currentTime + startAt);
      gain.gain.linearRampToValueAtTime(peakGain, ctx.currentTime + startAt + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startAt + duration);

      osc.connect(gain);
      gain.connect(compressor);
      compressor.connect(ctx.destination);

      osc.start(ctx.currentTime + startAt);
      osc.stop(ctx.currentTime + startAt + duration);
    };

    // Sub-bass boom
    play(55,  0,    0.6, 0.5);
    // Mid bass hit
    play(110, 0,    0.5, 0.35);
    // Second note (the "dum")
    play(82,  0.45, 1.2, 0.7);
    play(164, 0.45, 1.0, 0.4);
    // High harmonic shimmer
    play(328, 0.5,  0.8, 0.15);
  } catch {
    // Audio not available, silently skip
  }
}

// ─── IntroAnimation ───────────────────────────────────────────────────────────
export default function IntroAnimation({ onComplete, logoUrl }: IntroAnimationProps) {
  const [phase, setPhase] = useState<'logo' | 'exit'>('logo');
  const soundPlayed = useRef(false);

  useEffect(() => {
    // Play sound & schedule phases
    const t1 = setTimeout(() => {
      if (!soundPlayed.current) {
        soundPlayed.current = true;
        playIntroSound();
      }
    }, 200);

    const t2 = setTimeout(() => setPhase('exit'), 2600);
    const t3 = setTimeout(() => onComplete(), 3200);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== 'exit' ? (
        <motion.div
          key="intro"
          className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{
              scale: [0.6, 1.08, 1.0],
              opacity: [0, 1, 1],
            }}
            transition={{
              duration: 0.8,
              delay: 0.15,
              times: [0, 0.7, 1],
              ease: 'easeOut',
            }}
            className="flex flex-col items-center gap-5 select-none"
          >
            {/* Logo image or letter mark */}
            <div className="relative">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="w-28 h-28 object-contain rounded-2xl"
                  style={{ filter: 'drop-shadow(0 0 40px rgba(52,211,153,0.6))' }}
                />
              ) : (
                <div
                  className="w-28 h-28 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center"
                  style={{ boxShadow: '0 0 60px rgba(52,211,153,0.5), 0 0 120px rgba(52,211,153,0.2)' }}
                >
                  <span className="text-6xl font-black text-white">C</span>
                </div>
              )}

              {/* Glow ring */}
              <motion.div
                className="absolute inset-0 rounded-2xl"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [0, 0.6, 0], scale: [0.8, 1.4, 1.8] }}
                transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
                style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.3) 0%, transparent 70%)' }}
              />
            </div>

            {/* Brand name */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-center"
            >
              <p className="text-white text-2xl font-bold tracking-widest uppercase">
                Camaleão
              </p>
              <p className="text-emerald-400/70 text-xs tracking-[0.3em] uppercase mt-1">
                Ecoturismo
              </p>
            </motion.div>
          </motion.div>

          {/* Scanline effect */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.03 }}
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 4px)',
            }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
