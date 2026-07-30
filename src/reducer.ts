import { BREAK_TOTAL, FOCUS_TOTAL } from './types';
import type { AppState, FocusPhase, Task } from './types';

export type Action =
  | { type: 'ADD_TASK'; id: string; text: string }
  | { type: 'REMOVE_TASK'; id: string }
  | { type: 'STRIKE'; id: string }
  | { type: 'COMPLETE'; id: string }
  | { type: 'OPEN_CAPTURE' }
  | { type: 'CLOSE_CAPTURE' }
  | { type: 'SET_CAPTURE_TEXT'; text: string }
  | { type: 'ENTER_FOCUS'; id: string }
  | { type: 'EXIT_FOCUS' }
  | { type: 'FOCUS_TOGGLE' }
  | { type: 'FOCUS_RESET' }
  | { type: 'TICK' }
  | { type: 'SET_COMPACT'; compact: boolean };

const currentTotal = (phase: FocusPhase) => (phase === 'break' ? BREAK_TOTAL : FOCUS_TOTAL);

const patch = (tasks: Task[], id: string, fn: (t: Task) => Task) =>
  tasks.map((t) => (t.id === id ? fn(t) : t));

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_TASK':
      return {
        ...state,
        tasks: [{ id: action.id, text: action.text, done: false, striking: false }, ...state.tasks],
        captureText: '',
        captureOpen: false,
      };

    case 'REMOVE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== action.id),
        focusId: state.focusId === action.id ? null : state.focusId,
      };

    case 'STRIKE': {
      const t = state.tasks.find((x) => x.id === action.id);
      if (!t || t.done || t.striking) return state;
      return { ...state, tasks: patch(state.tasks, action.id, (x) => ({ ...x, striking: true })) };
    }

    case 'COMPLETE':
      return {
        ...state,
        tasks: patch(state.tasks, action.id, (x) => ({ ...x, striking: false, done: true })),
      };

    case 'OPEN_CAPTURE':
      return { ...state, captureOpen: true };
    case 'CLOSE_CAPTURE':
      return { ...state, captureOpen: false };
    case 'SET_CAPTURE_TEXT':
      return { ...state, captureText: action.text };

    case 'ENTER_FOCUS': {
      const t = state.tasks.find((x) => x.id === action.id);
      if (!t || t.done) return state;
      return {
        ...state,
        focusId: action.id,
        focusPhase: 'focus',
        focusLeft: FOCUS_TOTAL,
        focusRunning: true,
        captureOpen: false,
      };
    }
    case 'EXIT_FOCUS':
      return { ...state, focusId: null, focusRunning: false };
    case 'FOCUS_TOGGLE':
      return { ...state, focusRunning: !state.focusRunning };
    case 'FOCUS_RESET':
      return { ...state, focusLeft: currentTotal(state.focusPhase), focusRunning: false };

    case 'TICK': {
      if (state.focusId == null || !state.focusRunning) return state;
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
