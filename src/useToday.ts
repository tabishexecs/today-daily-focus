import { useCallback, useEffect, useReducer, useRef } from 'react';
import { reducer } from './reducer';
import { FOCUS_TOTAL } from './types';
import type { AppState, Task } from './types';

// v2 dropped the slots/queue split for a single stream; v1 payloads are not read.
const STORAGE_KEY = 'today.v2';
/**
 * Which task sat at the centre of the band when we last stopped scrolling. Stored as an id,
 * not a pixel offset, so it survives a breakpoint change and keeps pointing at the same task
 * when work is added above it. Its own key, so scrolling never rewrites the task list.
 */
const ANCHOR_KEY = 'today.v2.anchor';

const SEED = [
  'Ship the billing migration',
  'Reply to Dana re: Q3 roadmap',
  'Draft the onboarding email',
  "Review Priya's pull request",
  'Cancel the old analytics vendor',
  'Outline the offsite agenda',
  'Fix the flaky auth test',
  'Expense the conference tickets',
];

const seedTasks = (): Task[] =>
  SEED.map((text, i) => ({ id: 't' + i, text, done: false, striking: false }));

function loadTasks(): Task[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { tasks?: Task[] };
    return Array.isArray(parsed.tasks) ? parsed.tasks : null;
  } catch {
    return null;
  }
}

function readAnchor(): string | null {
  try {
    return localStorage.getItem(ANCHOR_KEY);
  } catch {
    return null;
  }
}

/** Next free numeric id suffix, so reloading can't mint an id a saved task already owns. */
function nextId(tasks: Task[]): number {
  let max = -1;
  for (const t of tasks) {
    const m = /^t(\d+)$/.exec(t.id);
    if (m) max = Math.max(max, +m[1]);
  }
  return max + 1;
}

function createInitialState(): AppState {
  return {
    tasks: loadTasks() ?? seedTasks(),
    captureOpen: false,
    captureText: '',
    focusId: null,
    focusRunning: false,
    focusPhase: 'focus',
    focusLeft: FOCUS_TOTAL,
    compact: typeof window !== 'undefined' && window.innerWidth < 720,
  };
}

export function useToday() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  // Keep a ref to the latest state so document-level listeners and timeouts
  // read current values without re-subscribing.
  const stateRef = useRef(state);
  stateRef.current = state;

  const nid = useRef(nextId(state.tasks));
  const inputRef = useRef<HTMLInputElement | null>(null);
  // Read once: after mount the stream owns the live scroll position.
  const initialAnchorId = useRef(readAnchor()).current;

  // --- Persistence ---
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks: state.tasks }));
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }, [state.tasks]);

  const saveAnchor = useCallback((id: string | null) => {
    try {
      if (id) localStorage.setItem(ANCHOR_KEY, id);
      else localStorage.removeItem(ANCHOR_KEY);
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }, []);

  // --- Multi-step orchestrations (timeouts live here, not in the reducer) ---
  const complete = useCallback((id: string) => {
    const t = stateRef.current.tasks.find((x) => x.id === id);
    if (!t || t.done || t.striking) return;
    dispatch({ type: 'STRIKE', id });
    setTimeout(() => dispatch({ type: 'COMPLETE', id }), 520);
  }, []);

  const enterFocus = useCallback((id: string) => dispatch({ type: 'ENTER_FOCUS', id }), []);

  const focusComplete = useCallback(() => {
    const id = stateRef.current.focusId;
    dispatch({ type: 'EXIT_FOCUS' });
    if (id != null) complete(id);
  }, [complete]);

  const openCapture = useCallback(() => {
    dispatch({ type: 'OPEN_CAPTURE' });
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const onCapKey = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const t = (stateRef.current.captureText || '').trim();
      if (!t) {
        dispatch({ type: 'CLOSE_CAPTURE' });
        return;
      }
      dispatch({ type: 'ADD_TASK', id: 't' + nid.current++, text: t });
    } else if (e.key === 'Escape') {
      dispatch({ type: 'CLOSE_CAPTURE' });
      dispatch({ type: 'SET_CAPTURE_TEXT', text: '' });
    }
  }, []);

  // --- Global listeners: outside-click to dismiss capture, resize ---
  useEffect(() => {
    const onDocDown = (e: PointerEvent) => {
      if (!stateRef.current.captureOpen) return;
      const target = e.target as HTMLElement;
      if (target.closest && target.closest('[data-capture]')) return;
      dispatch({ type: 'CLOSE_CAPTURE' });
    };
    const onResize = () => dispatch({ type: 'SET_COMPACT', compact: window.innerWidth < 720 });

    document.addEventListener('pointerdown', onDocDown, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('pointerdown', onDocDown, true);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // --- Pomodoro interval ---
  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearInterval(id);
  }, []);

  const actions = {
    dispatch,
    complete,
    enterFocus,
    focusComplete,
    openCapture,
    onCapKey,
    setCaptureText: (text: string) => dispatch({ type: 'SET_CAPTURE_TEXT', text }),
    removeTask: (id: string) => dispatch({ type: 'REMOVE_TASK', id }),
    saveAnchor,
    exitFocus: () => dispatch({ type: 'EXIT_FOCUS' }),
    focusToggle: () => dispatch({ type: 'FOCUS_TOGGLE' }),
    focusReset: () => dispatch({ type: 'FOCUS_RESET' }),
    logout: () => {
      /* stub — wire to your real session */
    },
    inputRef,
  };

  return { state, actions, initialAnchorId };
}
