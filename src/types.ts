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
 * Everything the reducer owns. The task list is not here — Convex owns it, and so is the
 * pomodoro: its clock outlives this tab, so it lives in `api.pomodoro` rather than in here.
 *
 * Two clocks still, and they are not the same one read from both ends: the pomodoro is the
 * session's, counting down whatever is on screen, while this one is a stopwatch on one task.
 *
 * Both are stored the same way, and neither is a counter that something has to tick. Elapsed
 * time is `now - focusStartedAt`, worked out at the moment it is drawn, so it stays right
 * across a backgrounded tab, a throttled timer and a closed lid — none of which run any code.
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
  /**
   * Epoch ms at which the stopwatch was last started, or null while it is paused. Doubles as
   * "is it running": one field cannot disagree with itself.
   */
  focusStartedAt: number | null;
  /** Milliseconds banked on `focusTimerId` before the current run. */
  focusBaseMs: number;
  /** Null until the panel is first moved, which is what leaves it pinned to its corner. */
  pomodoroPos: PanelPos | null;
  compact: boolean;
}

/** Milliseconds on `focusTimerId` as of `now`, running or not. */
export const focusElapsedMs = (state: UiState, now: number): number =>
  state.focusBaseMs + (state.focusStartedAt === null ? 0 : Math.max(0, now - state.focusStartedAt));

/** Mirrors `NOTE_MAX` in `convex/notes.ts`, which rejects anything longer. */
export const NOTE_MAX = 2000;

/** Mirrors `NOTE_MIN_W` / `NOTE_MIN_H` in `convex/notes.ts`, which clamps to them. */
export const NOTE_MIN_W = 188;
export const NOTE_MIN_H = 104;

export const FOCUS_TOTAL = 1500; // 25:00
export const BREAK_TOTAL = 300; // 5:00
export const LONG_BREAK_TOTAL = 900; // 15:00

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

/**
 * The same lengths in milliseconds, as `api.pomodoro.*` wants them. Sent with every mutation
 * rather than duplicated on the server, which is what keeps `?fast` shortening the real clock
 * instead of only the one this tab draws.
 *
 * A module constant because `FAST` is read once: a factor that changed under a running clock
 * would leave a deadline that no longer matches the total it is drawn against.
 */
export const PHASE_MS: Record<PomoPhase, number> = {
  focus: totalFor('focus') * 1000,
  break: totalFor('break') * 1000,
  longBreak: totalFor('longBreak') * 1000,
};
