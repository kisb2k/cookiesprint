/**
 * Lightweight SFX using Web Audio API (no asset files).
 * Used for jump, slide, cookie collect, hit, game over.
 */

const MUTE_STORAGE_KEY = 'sweetsprint-muted';

let audioContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

function beep(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.15
): void {
  const ctx = getContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = frequency;
  osc.type = type;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

export type SoundEvent = 'jump' | 'slide' | 'cookie' | 'hit' | 'gameover';

let muted = false;

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(MUTE_STORAGE_KEY, String(value));
  } catch {
    // ignore
  }
}

export function isMuted(): boolean {
  return muted;
}

export function loadMutePreference(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem(MUTE_STORAGE_KEY);
    muted = stored === 'true';
    return muted;
  } catch {
    return false;
  }
}

export function playSound(event: SoundEvent): void {
  if (muted) return;
  const ctx = getContext();
  if (!ctx) return;
  // Resume context if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') ctx.resume();

  switch (event) {
    case 'jump':
      beep(440, 0.08, 'sine', 0.12);
      break;
    case 'slide':
      beep(220, 0.06, 'square', 0.1);
      break;
    case 'cookie':
      beep(880, 0.05, 'sine', 0.15);
      beep(1320, 0.08, 'sine', 0.12);
      break;
    case 'hit':
      beep(150, 0.15, 'sawtooth', 0.2);
      beep(100, 0.2, 'square', 0.15);
      break;
    case 'gameover':
      beep(200, 0.3, 'sawtooth', 0.18);
      beep(160, 0.4, 'square', 0.15);
      break;
    default:
      break;
  }
}
