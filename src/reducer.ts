import { BREAK_TOTAL, FOCUS_TOTAL } from './types';
import type { AppState, FocusPhase, QueueItem, Task } from './types';

export type Action =
  | { type: 'START_DRAG'; item: QueueItem; x: number; y: number }
  | { type: 'DRAG_MOVE'; x: number; y: number; overSlot: number | null }
  | { type: 'DROP' }
  | { type: 'CANCEL_DRAG' }
  | { type: 'CLEAR_JUST_PLACED'; index: number }
  | { type: 'SET_LOCKING' }
  | { type: 'FINISH_LOCK' }
  | { type: 'STRIKE'; index: number }
  | { type: 'COMPLETE'; index: number }
  | { type: 'WIN' }
  | { type: 'END_ROLL' }
  | { type: 'NEW_DAY'; date: string }
  | { type: 'OPEN_CAPTURE' }
  | { type: 'CLOSE_CAPTURE' }
  | { type: 'SET_CAPTURE_TEXT'; text: string }
  | { type: 'ADD_QUEUE'; id: string; text: string }
  | { type: 'REMOVE_QUEUE'; id: string }
  | { type: 'OPEN_QUEUE' }
  | { type: 'CLOSE_QUEUE' }
  | { type: 'TOGGLE_QUEUE' }
  | { type: 'ENTER_FOCUS'; index: number }
  | { type: 'EXIT_FOCUS' }
  | { type: 'FOCUS_TOGGLE' }
  | { type: 'FOCUS_RESET' }
  | { type: 'TICK' }
  | { type: 'SET_COMPACT'; compact: boolean };

const currentTotal = (phase: FocusPhase) => (phase === 'break' ? BREAK_TOTAL : FOCUS_TOTAL);

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'START_DRAG':
      if (state.dayLocked) return state;
      return { ...state, drag: { item: action.item, x: action.x, y: action.y }, queueDim: true, overSlot: null };

    case 'DRAG_MOVE':
      if (!state.drag) return state;
      return { ...state, drag: { ...state.drag, x: action.x, y: action.y }, overSlot: action.overSlot };

    case 'DROP': {
      const { drag, overSlot, slots, queue, dayLocked } = state;
      if (drag && overSlot != null && !slots[overSlot] && !dayLocked) {
        const ns = slots.slice();
        ns[overSlot] = { id: drag.item.id, text: drag.item.text, done: false, striking: false, justPlaced: true };
        const nq = queue.filter((q) => q.id !== drag.item.id);
        return { ...state, slots: ns, queue: nq, drag: null, queueDim: false, overSlot: null };
      }
      return { ...state, drag: null, queueDim: false, overSlot: null };
    }

    case 'CANCEL_DRAG':
      return { ...state, drag: null, queueDim: false, overSlot: null };

    case 'CLEAR_JUST_PLACED': {
      const s = state.slots[action.index];
      if (!s) return state;
      const ns = state.slots.slice();
      ns[action.index] = { ...s, justPlaced: false };
      return { ...state, slots: ns };
    }

    case 'SET_LOCKING':
      return { ...state, locking: true };

    case 'FINISH_LOCK':
      return { ...state, dayLocked: true, locking: false, queueOpen: false };

    case 'STRIKE': {
      const s = state.slots[action.index];
      if (!s || s.done || s.striking) return state;
      const ns = state.slots.slice();
      ns[action.index] = { ...s, striking: true };
      return { ...state, slots: ns };
    }

    case 'COMPLETE': {
      const s = state.slots[action.index];
      if (!s) return state;
      const ns = state.slots.slice();
      ns[action.index] = { ...s, striking: false, done: true };
      return { ...state, slots: ns };
    }

    case 'WIN':
      return { ...state, dayWon: true, rolling: true, dayNumber: state.dayNumber + 1 };

    case 'END_ROLL':
      return { ...state, rolling: false };

    case 'NEW_DAY': {
      const back: QueueItem[] = state.slots
        .filter((s): s is Task => !!s && !s.done)
        .map((s) => ({ id: s.id, text: s.text }));
      return {
        ...state,
        slots: [null, null, null],
        queue: [...state.queue, ...back],
        dayLocked: false,
        locking: false,
        dayWon: false,
        queueOpen: !state.compact,
        dayDate: action.date,
      };
    }

    case 'OPEN_CAPTURE':
      return { ...state, captureOpen: true };
    case 'CLOSE_CAPTURE':
      return { ...state, captureOpen: false };
    case 'SET_CAPTURE_TEXT':
      return { ...state, captureText: action.text };

    case 'ADD_QUEUE':
      return {
        ...state,
        queue: [{ id: action.id, text: action.text }, ...state.queue],
        captureText: '',
        captureOpen: false,
      };

    case 'REMOVE_QUEUE':
      return { ...state, queue: state.queue.filter((q) => q.id !== action.id) };

    case 'OPEN_QUEUE':
      return { ...state, queueOpen: true };
    case 'CLOSE_QUEUE':
      return { ...state, queueOpen: false };
    case 'TOGGLE_QUEUE':
      return { ...state, queueOpen: !state.queueOpen };

    case 'ENTER_FOCUS': {
      const s = state.slots[action.index];
      if (!s || s.done) return state;
      return {
        ...state,
        focusIndex: action.index,
        focusPhase: 'focus',
        focusLeft: FOCUS_TOTAL,
        focusRunning: true,
        captureOpen: false,
        queueOpen: false,
      };
    }
    case 'EXIT_FOCUS':
      return { ...state, focusIndex: null, focusRunning: false };
    case 'FOCUS_TOGGLE':
      return { ...state, focusRunning: !state.focusRunning };
    case 'FOCUS_RESET':
      return { ...state, focusLeft: currentTotal(state.focusPhase), focusRunning: false };

    case 'TICK': {
      if (state.focusIndex == null || !state.focusRunning) return state;
      if (state.focusLeft > 1) return { ...state, focusLeft: state.focusLeft - 1 };
      const nextPhase: FocusPhase = state.focusPhase === 'focus' ? 'break' : 'focus';
      return { ...state, focusPhase: nextPhase, focusLeft: currentTotal(nextPhase), focusRunning: true };
    }

    case 'SET_COMPACT':
      return state.compact === action.compact ? state : { ...state, compact: action.compact };

    default:
      return state;
  }
}
