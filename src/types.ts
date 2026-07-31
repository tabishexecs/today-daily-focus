import type { Id } from '../convex/_generated/dataModel';

/** A Convex document id. A branded string, so it still compares and serializes as one. */
export type TaskId = Id<'tasks'>;

/** What the server stores and `api.tasks.list` returns. */
export interface StoredTask {
  id: TaskId;
  text: string;
  done: boolean;
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

export const FOCUS_TOTAL = 1500; // 25:00
export const BREAK_TOTAL = 300; // 5:00
