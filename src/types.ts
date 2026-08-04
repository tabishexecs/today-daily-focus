import type { Id } from '../convex/_generated/dataModel';

export type TaskId = Id<'tasks'>;
export type NoteId = Id<'notes'>;

/** What `api.tasks.list` returns. */
export interface StoredTask {
  id: TaskId;
  text: string;
  done: boolean;
}

export interface Note {
  id: NoteId;
  text: string;
  /** Fractions of the focus overlay, so a note holds its place on any window size. */
  x: number;
  y: number;
  /** Pixels. The server fills these in for a note that has never been resized. */
  w: number;
  h: number;
}

/**
 * A task as the stream reads it. `striking` stays out of `StoredTask`: it lasts 520ms and
 * belongs to the device that clicked, so persisting it would mean a write per animation.
 */
export interface Task extends StoredTask {
  striking: boolean;
}

export type PomoPhase = 'focus' | 'break' | 'longBreak';

/** The pomodoro panel's top-left corner, as fractions of the window. */
export interface PanelPos {
  x: number;
  y: number;
}

/**
 * Everything the reducer owns. The task list is not here — Convex owns it.
 *
 * Two clocks, and they are not the same one read from both ends: the pomodoro is the session's,
 * counting down whatever is on screen, while `focusElapsed` is a stopwatch on one task.
 */
export interface UiState {
  striking: TaskId[];
  captureOpen: boolean;
  captureText: string;
  focusId: TaskId | null;
  /**
   * The task the stopwatch belongs to. Outlives `focusId`, which goes null on exit — that is
   * what lets the same task be picked back up at the time it was left at.
   */
  focusTimerId: TaskId | null;
  focusRunning: boolean;
  /** Seconds spent on `focusTimerId`. Counts up, against no total. */
  focusElapsed: number;
  pomoRunning: boolean;
  pomoPhase: PomoPhase;
  /** Seconds still to go in `pomoPhase`. */
  pomoLeft: number;
  /**
   * Focus phases finished since the last long break, so the fourth one can hand over to the
   * longer rest. Counts completions, not starts: the focus in progress is not in here yet.
   */
  pomoDone: number;
  /** Null until the panel is first moved, which is what leaves it pinned to its corner. */
  pomodoroPos: PanelPos | null;
  compact: boolean;
}

/** Mirrors `NOTE_MAX` in `convex/notes.ts`, which rejects anything longer. */
export const NOTE_MAX = 2000;

/** Mirrors `NOTE_MIN_W` / `NOTE_MIN_H` in `convex/notes.ts`, which clamps to them. */
export const NOTE_MIN_W = 188;
export const NOTE_MIN_H = 104;

export const FOCUS_TOTAL = 1500; // 25:00
export const BREAK_TOTAL = 300; // 5:00
export const LONG_BREAK_TOTAL = 900; // 15:00

/**
 * Focus phases per long break. Cirillo's four: three short breaks are enough to carry you
 * through a set, and the rest that follows has to be long enough to leave the desk for.
 */
export const LONG_BREAK_EVERY = 4;

const PHASE_TOTAL: Record<PomoPhase, number> = {
  focus: FOCUS_TOTAL,
  break: BREAK_TOTAL,
  longBreak: LONG_BREAK_TOTAL,
};

/**
 * Development only: `?fast` on the URL divides every phase by 60, putting the whole set —
 * three short breaks, the long one, and all five chimes — inside three minutes instead of two
 * hours. `?fast=<n>` divides by `n` instead.
 *
 * Behind `import.meta.env.DEV`, so the flag does not exist in a built app and no one's real
 * pomodoro can be shortened by a link. Read once: a factor that changed under a running clock
 * would leave `pomoLeft` past the total it is drawn against.
 */
function fastFactor(): number {
  if (!import.meta.env.DEV || typeof window === 'undefined') return 1;
  const raw = new URLSearchParams(window.location.search).get('fast');
  if (raw === null) return 1;
  const n = Number(raw);
  // `?fast` alone arrives as an empty string, which `Number` reads as 0. Anything that isn't a
  // usable divisor means the same thing as the bare flag: as fast as it goes.
  return Number.isFinite(n) && n >= 1 ? n : 60;
}

const FAST = fastFactor();

/** At least a second, so a large `?fast` cannot produce a phase that ends before it starts. */
export const totalFor = (phase: PomoPhase): number =>
  Math.max(1, Math.round(PHASE_TOTAL[phase] / FAST));
