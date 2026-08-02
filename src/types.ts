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

export type FocusPhase = 'focus' | 'break';

/** The pomodoro panel's top-left corner, as fractions of the window. */
export interface PanelPos {
  x: number;
  y: number;
}

/** Everything the reducer owns. The task list is not here — Convex owns it. */
export interface UiState {
  striking: TaskId[];
  captureOpen: boolean;
  captureText: string;
  focusId: TaskId | null;
  /**
   * The task the clock belongs to. Outlives `focusId`, which goes null on exit — that is what
   * lets the same task be picked back up mid-pomodoro.
   */
  focusTimerId: TaskId | null;
  focusRunning: boolean;
  focusPhase: FocusPhase;
  focusLeft: number;
  /** Whether the panel is showing. The clock runs whether or not anything is looking at it. */
  pomodoroOpen: boolean;
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

export const totalFor = (phase: FocusPhase): number =>
  phase === 'break' ? BREAK_TOTAL : FOCUS_TOTAL;
