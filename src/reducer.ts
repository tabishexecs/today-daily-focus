import { FOCUS_TOTAL, totalFor } from './types';
import type { FocusPhase, TaskId, UiState } from './types';

/** UI state only — tasks are Convex mutations, so these are the local half of those flows. */
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
  | { type: 'TOGGLE_POMODORO' }
  | { type: 'MOVE_POMODORO'; x: number; y: number }
  | { type: 'TICK' }
  | { type: 'SET_COMPACT'; compact: boolean };

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
    // Keeps the draft, so a stray outside click doesn't lose it. Escape and submit clear it.
    case 'CLOSE_CAPTURE':
      return { ...state, captureOpen: false };
    case 'SET_CAPTURE_TEXT':
      return { ...state, captureText: action.text };

    case 'ENTER_FOCUS': {
      // Re-entering the same task resumes its clock; any other task starts a fresh one.
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
      return { ...state, focusId: null, focusRunning: false, pomodoroOpen: false };
    case 'FOCUS_TOGGLE':
      return { ...state, focusRunning: !state.focusRunning };
    case 'FOCUS_RESET':
      return { ...state, focusLeft: totalFor(state.focusPhase), focusRunning: false };

    // Opening starts the clock — the button says "Start Pomodoro". Closing only hides the
    // panel; the pomodoro carries on behind it.
    case 'TOGGLE_POMODORO':
      return state.pomodoroOpen
        ? { ...state, pomodoroOpen: false }
        : { ...state, pomodoroOpen: true, focusRunning: true };

    case 'MOVE_POMODORO':
      return { ...state, pomodoroPos: { x: action.x, y: action.y } };

    case 'TICK': {
      if (state.focusId == null || !state.focusRunning) return state;
      if (state.focusLeft > 1) return { ...state, focusLeft: state.focusLeft - 1 };
      const next: FocusPhase = state.focusPhase === 'focus' ? 'break' : 'focus';
      return { ...state, focusPhase: next, focusLeft: totalFor(next), focusRunning: true };
    }

    case 'SET_COMPACT':
      return state.compact === action.compact ? state : { ...state, compact: action.compact };

    default:
      return state;
  }
}
