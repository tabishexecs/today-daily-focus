import type { PomoPhase } from './types';

/**
 * The pomodoro's alarm.
 *
 * Synthesised rather than played from a file: a struck note and its decay is a handful of
 * WebAudio nodes, where an asset would be bytes to ship and a fetch that could still be in
 * flight at the one moment the app has something to say. It also lets each phase have its own
 * shape rather than one buzzer for all three.
 *
 * The motifs say what is *beginning*, not what just ended — you already know you finished.
 */

/** Sine partials of a struck bell, as ratios of the fundamental and their share of the level. */
const PARTIALS: [ratio: number, level: number][] = [
  [1, 1],
  [2.76, 0.16],
];

/** Quiet: this lands in a room someone is concentrating in, and it is the only sound the app makes. */
const PEAK = 0.2;
/** Long enough not to click, short enough to still read as struck rather than swelled. */
const ATTACK = 0.008;

interface Motif {
  /** In order. Hz. */
  hz: number[];
  /** Seconds between strikes. They overlap — each note rings on under the next. */
  gap: number;
  /** Seconds from strike to silence. */
  decay: number;
}

const E5 = 659.25;
const G5 = 784.0;
const C6 = 1046.5;

/**
 * Both breaks fall, and the return to work rises. The long break falls furthest and rings
 * longest, which is the only warning you get that this one is fifteen minutes.
 */
const MOTIF: Record<PomoPhase, Motif> = {
  focus: { hz: [G5, C6], gap: 0.22, decay: 1.3 },
  break: { hz: [C6, G5], gap: 0.26, decay: 1.5 },
  longBreak: { hz: [C6, G5, E5], gap: 0.3, decay: 2.4 },
};

let ctx: AudioContext | null = null;
/** Once a context has failed to build there is no second thing to try. */
let unavailable = false;

function audio(): AudioContext | null {
  if (ctx) return ctx;
  if (unavailable || typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) {
    unavailable = true;
    return null;
  }
  try {
    ctx = new Ctor();
  } catch {
    unavailable = true;
  }
  return ctx;
}

/**
 * Autoplay policy: a context built before the first gesture starts suspended, and a chime
 * rung into it is silent. Called from the pomodoro's own controls, which are that gesture —
 * and again on each one, since a browser may suspend a backgrounded tab's context too.
 */
export function unlockChime(): void {
  const c = audio();
  if (c && c.state === 'suspended') void c.resume();
}

/** One struck note. Its nodes are built for it and collected once they have stopped. */
function ring(c: AudioContext, hz: number, at: number, decay: number): void {
  const out = c.createGain();
  out.connect(c.destination);
  // Exponential, because loudness is heard that way — a linear fade dies in its last instant.
  // Neither end can be zero on this ramp, so a hair above it stands in for silence.
  out.gain.setValueAtTime(0.0001, at);
  out.gain.exponentialRampToValueAtTime(PEAK, at + ATTACK);
  out.gain.exponentialRampToValueAtTime(0.0001, at + decay);

  for (const [ratio, level] of PARTIALS) {
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(hz * ratio, at);
    const mix = c.createGain();
    mix.gain.setValueAtTime(level, at);
    osc.connect(mix).connect(out);
    osc.start(at);
    osc.stop(at + decay + 0.05);
  }
}

/** Scheduled on the audio clock rather than with timers, so the notes keep their spacing. */
function strike(hz: number[], gap: number, decay: number): void {
  const c = audio();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  // A moment of headroom: scheduling at `currentTime` exactly can clip the attack.
  const start = c.currentTime + 0.02;
  hz.forEach((f, i) => ring(c, f, start + i * gap, decay));
}

/** Rung as `phase` begins. */
export function playChime(phase: PomoPhase): void {
  const { hz, gap, decay } = MOTIF[phase];
  strike(hz, gap, decay);
}
