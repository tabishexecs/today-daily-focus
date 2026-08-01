import type { Id } from '../convex/_generated/dataModel';

/** A Convex document id. A branded string, so it still compares and serializes as one. */
export type TaskId = Id<'tasks'>;
export type NoteId = Id<'notes'>;

/** What the server stores and `api.tasks.list` returns. */
export interface StoredTask {
  id: TaskId;
  text: string;
  done: boolean;
}

/**
 * One note pinned over the focused task, as `api.notes.forTask` returns it. `x` and `y` are
 * fractions of the focus overlay, so they mean the same thing on any window size.
 */
export interface Note {
  id: NoteId;
  text: string;
  x: number;
  y: number;
  /** Size in pixels. The server fills these in for a note that has never been resized. */
  w: number;
  h: number;
}

/**
 * A task as the stream reads it: the stored fields plus the strike-through animation.
 * `striking` is deliberately not part of `StoredTask` — it lasts 520ms and belongs to the
 * device that clicked, so persisting it would mean a write per animation and a row that
 * arrives mid-strike on another device.
 */
export interface Task extends StoredTask {
  striking: boolean;
}

export type FocusPhase = 'focus' | 'break';

/** Everything the reducer owns. The task list is not here — Convex owns it. */
export interface UiState {
  /** Ids currently striking through. Cleared when the completion lands. */
  striking: TaskId[];
  captureOpen: boolean;
  captureText: string;
  focusId: TaskId | null;
  focusRunning: boolean;
  focusPhase: FocusPhase;
  focusLeft: number;
  compact: boolean;
}

/** Matches `NOTE_MAX` in `convex/notes.ts`, which rejects anything longer. */
export const NOTE_MAX = 2000;

/** Matches `NOTE_MIN_W` / `NOTE_MIN_H` in `convex/notes.ts`, which clamps to them. */
export const NOTE_MIN_W = 188;
export const NOTE_MIN_H = 104;

export const FOCUS_TOTAL = 1500; // 25:00
export const BREAK_TOTAL = 300; // 5:00
