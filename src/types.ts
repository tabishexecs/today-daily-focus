export interface Task {
  id: string;
  text: string;
  done: boolean;
  striking: boolean;
  justPlaced: boolean;
}

export interface QueueItem {
  id: string;
  text: string;
}

export type FocusPhase = 'focus' | 'break';

export interface DragState {
  item: QueueItem;
  x: number;
  y: number;
}

export interface FlyGhost {
  text: string;
  phase: 'start' | 'end';
}

export interface AppState {
  dayNumber: number;
  dayDate: string; // YYYY-MM-DD the current day was started
  rolling: boolean;
  slots: (Task | null)[]; // always length 3
  queue: QueueItem[];
  queueOpen: boolean;
  dayLocked: boolean;
  locking: boolean;
  dayWon: boolean;
  captureOpen: boolean;
  captureText: string;
  drag: DragState | null;
  overSlot: number | null;
  queueDim: boolean;
  flyGhost: FlyGhost | null;
  focusIndex: number | null;
  focusRunning: boolean;
  focusPhase: FocusPhase;
  focusLeft: number;
  compact: boolean;
}

export const FOCUS_TOTAL = 1500; // 25:00
export const BREAK_TOTAL = 300; // 5:00
