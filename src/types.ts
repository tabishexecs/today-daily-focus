export interface Task {
  id: string;
  text: string;
  done: boolean;
  striking: boolean;
}

export type FocusPhase = 'focus' | 'break';

export interface AppState {
  /** Every task, newest first. There is no separate backlog — the stream is the list. */
  tasks: Task[];
  captureOpen: boolean;
  captureText: string;
  focusId: string | null;
  focusRunning: boolean;
  focusPhase: FocusPhase;
  focusLeft: number;
  compact: boolean;
}

export const FOCUS_TOTAL = 1500; // 25:00
export const BREAK_TOTAL = 300; // 5:00
