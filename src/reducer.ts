import { LONG_BREAK_EVERY, totalFor } from './types';
import type { PomoPhase, TaskId, UiState } from './types';

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
  | { type: 'POMO_TOGGLE' }
  | { type: 'POMO_RESET' }
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
      // Re-entering the same task picks its stopwatch up where it was left; any other task
      // starts from nothing. The pomodoro is untouched either way — it belongs to the session,
      // not to whatever is being worked on.
      const resumed = state.focusTimerId === action.id;
      return {
        ...state,
        focusId: action.id,
        focusTimerId: action.id,
        focusElapsed: resumed ? state.focusElapsed : 0,
        focusRunning: true,
        captureOpen: false,
      };
    }
    // The stopwatch stops but is not cleared: `focusTimerId` still names the task holding it.
    case 'EXIT_FOCUS':
      return { ...state, focusId: null, focusRunning: false };
    case 'FOCUS_TOGGLE':
      return { ...state, focusRunning: !state.focusRunning };

    case 'POMO_TOGGLE':
      return { ...state, pomoRunning: !state.pomoRunning };
    case 'POMO_RESET':
      return { ...state, pomoLeft: totalFor(state.pomoPhase), pomoRunning: false };

    case 'MOVE_POMODORO':
      return { ...state, pomodoroPos: { x: action.x, y: action.y } };

    // Both clocks run off the one second, and each is gated on its own. Returning `state`
    // untouched when neither is going is what keeps a permanently mounted panel from
    // re-rendering the app every second it sits paused.
    case 'TICK': {
      const focusOn = state.focusId != null && state.focusRunning;
      if (!focusOn && !state.pomoRunning) return state;
      let next = state;
      if (focusOn) next = { ...next, focusElapsed: next.focusElapsed + 1 };
      if (state.pomoRunning) {
        if (state.pomoLeft > 1) next = { ...next, pomoLeft: next.pomoLeft - 1 };
        else {
          // A finished focus is one of the set; the fourth earns the long break and closes the
          // set out. Either break hands back to focus with the count as the focus left it.
          const done = state.pomoPhase === 'focus' ? state.pomoDone + 1 : state.pomoDone;
          const long = state.pomoPhase === 'focus' && done >= LONG_BREAK_EVERY;
          const phase: PomoPhase =
            state.pomoPhase === 'focus' ? (long ? 'longBreak' : 'break') : 'focus';
          next = {
            ...next,
            pomoPhase: phase,
            pomoLeft: totalFor(phase),
            pomoDone: long ? 0 : done,
            // Every hand-over stops here. A break that starts itself is counting rest nobody
            // has taken yet, and a focus that starts itself is counting work nobody has come
            // back to — the chime says the phase ended, and play says the next one begins.
            pomoRunning: false,
          };
        }
      }
      return next;
    }

    case 'SET_COMPACT':
      return state.compact === action.compact ? state : { ...state, compact: action.compact };

    default:
      return state;
  }
}
