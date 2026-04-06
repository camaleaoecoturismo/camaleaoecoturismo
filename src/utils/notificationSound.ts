/**
 * WhatsApp-style notification sounds using Web Audio API.
 * No audio files needed — generated programmatically.
 */

function tone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  volume = 0.35
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

/** Two ascending tones — incoming message (WhatsApp-like) */
export function playChatSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    tone(ctx, 880,  now,        0.13);
    tone(ctx, 1108, now + 0.11, 0.16);
    setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch {}
}

/** Single soft tone — new visitor arrived */
export function playVisitorSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    tone(ctx, 660, now, 0.12, 0.2);
    setTimeout(() => ctx.close().catch(() => {}), 500);
  } catch {}
}
