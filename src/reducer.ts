import { focusElapsedMs } from './types';
import type { TaskId, UiState } from './types';

/**
 * UI state only — tasks are Convex mutations, so these are the local half of those flows, and
 * the pomodoro is a Convex row, so it has no actions here at all.
 *
 * The three focus actions carry `now`. A reducer may not read the clock — same input, same
 * output — so the caller reads it and passes it in. That is the only ceremony the wall-clock
 * stopwatch costs, and there is no `TICK`: nothing accumulates, so nothing needs telling that
 * a second went by.
 */
export type Action =
  | { type: 'STRIKE'; id: TaskId }
  | { type: 'STRIKE_DONE'; id: TaskId }
  | { type: 'OPEN_CAPTURE' }
  | { type: 'CLOSE_CAPTURE' }
  | { type: 'SET_CAPTURE_TEXT'; text: string }
  | { type: 'ENTER_FOCUS'; id: TaskId; now: number }
  | { type: 'EXIT_FOCUS'; now: number }
  | { type: 'FOCUS_TOGGLE'; now: number }
  | { type: 'MOVE_POMODORO'; x: number; y: number }
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
      // Re-entering the same task picks its stopwatch up where it was left; any other task
      // starts from nothing. The pomodoro is untouched either way — it belongs to the session,
      // not to whatever is being worked on.
      const resumed = state.focusTimerId === action.id;
      return {
        ...state,
        focusId: action.id,
        focusTimerId: action.id,
        focusBaseMs: resumed ? state.focusBaseMs : 0,
        focusStartedAt: action.now,
        captureOpen: false,
      };
    }
    // The stopwatch stops but is not cleared: `focusTimerId` still names the task holding it,
    // and the run in progress is banked so re-entering resumes from the right number.
    case 'EXIT_FOCUS':
      return {
        ...state,
        focusId: null,
        focusBaseMs: focusElapsedMs(state, action.now),
        focusStartedAt: null,
      };
    case 'FOCUS_TOGGLE':
      return state.focusStartedAt === null
        ? { ...state, focusStartedAt: action.now }
        : { ...state, focusBaseMs: focusElapsedMs(state, action.now), focusStartedAt: null };

    case 'MOVE_POMODORO':
      return { ...state, pomodoroPos: { x: action.x, y: action.y } };

    case 'SET_COMPACT':
      return state.compact === action.compact ? state : { ...state, compact: action.compact };

    default:
      return state;
  }
}
