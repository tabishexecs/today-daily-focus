import { BREAK_TOTAL, FOCUS_TOTAL } from './types';
import type { FocusPhase, TaskId, UiState } from './types';

/**
 * Only UI state moves through here. Adding, completing and removing tasks are Convex
 * mutations, so the actions below are the local half of those flows (the strike animation,
 * the capture bar) plus everything that never leaves the device.
 */
export type Action =
  | { type: 'STRIKE'; id: TaskId }
  | { type: 'STRIKE_DONE'; id: TaskId }
  | { type: 'OPEN_CAPTURE' }
  | { type: 'CLOSE_CAPTURE' }
  | { type: 'SET_CAPTURE_TEXT'; text: string }
  | { type: 'ENTER_FOCUS'; id: TaskId }
  | { type: 'EXIT_FOCUS' }
  | { type: 'FOCUS_TOGGLE' }
  | { type: 'FOCUS_RESET' }
  | { type: 'TICK' }
  | { type: 'SET_COMPACT'; compact: boolean };

const currentTotal = (phase: FocusPhase) => (phase === 'break' ? BREAK_TOTAL : FOCUS_TOTAL);

export function reducer(state: UiState, action: Action): UiState {
  switch (action.type) {
    case 'STRIKE':
      return state.striking.includes(action.id)
        ? state
        : { ...state, striking: [...state.striking, action.id] };

    case 'STRIKE_DONE':
      return state.striking.includes(action.id)
        ? { ...state, striking: state.striking.filter((id) => id !== action.id) }
        : state;

    case 'OPEN_CAPTURE':
      return { ...state, captureOpen: true };
    // Closing alone keeps the draft, so a stray outside click doesn't lose what was typed.
    // Escape and a successful submit clear it explicitly.
    case 'CLOSE_CAPTURE':
      return { ...state, captureOpen: false };
    case 'SET_CAPTURE_TEXT':
      return { ...state, captureText: action.text };

    case 'ENTER_FOCUS': {
      // The clock belongs to the task rather than to the focus screen, so leaving and coming
      // back to the same task picks its pomodoro up where it was put down. Any other task
      // starts a fresh one — a pomodoro is a stretch of work on one thing.
      const resumed = state.focusTimerId === action.id;
      return {
        ...state,
        focusId: action.id,
        focusTimerId: action.id,
        focusPhase: resumed ? state.focusPhase : 'focus',
        focusLeft: resumed ? state.focusLeft : FOCUS_TOTAL,
        focusRunning: true,
        captureOpen: false,
      };
    }
    // The clock stops but is not cleared: `focusTimerId` still names the task holding it.
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
