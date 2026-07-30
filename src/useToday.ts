import { useCallback, useEffect, useReducer, useRef } from 'react';
import { reducer } from './reducer';
import { FOCUS_TOTAL } from './types';
import type { AppState, Task } from './types';

const STORAGE_KEY = 'today.v1';

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

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

interface Persisted {
  dayNumber: number;
  dayDate: string;
  slots: (Task | null)[];
  queue: { id: string; text: string }[];
  dayLocked: boolean;
  dayWon: boolean;
}

function loadPersisted(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Persisted;
  } catch {
    return null;
  }
}

function createInitialState(): AppState {
  const compact = typeof window !== 'undefined' && window.innerWidth < 720;
  const saved = loadPersisted();
  const today = todayStr();

  let dayNumber = 14;
  let dayDate = today;
  let slots: (Task | null)[] = [null, null, null];
  let queue = SEED.map((t, i) => ({ id: 'q' + i, text: t }));
  let dayLocked = false;
  let dayWon = false;

  if (saved) {
    dayNumber = saved.dayNumber;
    dayDate = saved.dayDate;
    queue = saved.queue;
    if (saved.dayDate === today) {
      // Same day — restore where we left off.
      slots = saved.slots;
      dayLocked = saved.dayLocked;
      dayWon = saved.dayWon;
    } else {
      // Date rolled over — carry unfinished tasks back to the queue, fresh day.
      const back = (saved.slots || [])
        .filter((s): s is Task => !!s && !s.done)
        .map((s) => ({ id: s.id, text: s.text }));
      queue = [...saved.queue, ...back];
      dayDate = today;
    }
  }

  return {
    dayNumber,
    dayDate,
    rolling: false,
    slots,
    queue,
    queueOpen: !compact,
    dayLocked,
    locking: false,
    dayWon,
    captureOpen: false,
    captureText: '',
    drag: null,
    overSlot: null,
    queueDim: false,
    flyGhost: null,
    focusIndex: null,
    focusRunning: false,
    focusPhase: 'focus',
    focusLeft: FOCUS_TOTAL,
    compact,
  };
}

export function useToday() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  // Keep a ref to the latest state so document-level listeners and timeouts
  // read current values without re-subscribing.
  const stateRef = useRef(state);
  stateRef.current = state;

  const nid = useRef(200);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // --- Persistence ---
  useEffect(() => {
    const { dayNumber, dayDate, slots, queue, dayLocked, dayWon } = state;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ dayNumber, dayDate, slots, queue, dayLocked, dayWon }),
      );
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }, [state.dayNumber, state.dayDate, state.slots, state.queue, state.dayLocked, state.dayWon]);

  // --- Multi-step orchestrations (timeouts live here, not in the reducer) ---
  const win = useCallback(() => {
    dispatch({ type: 'WIN' });
    setTimeout(() => dispatch({ type: 'END_ROLL' }), 680);
  }, []);

  const complete = useCallback(
    (i: number) => {
      const s = stateRef.current.slots[i];
      if (!s || s.done || s.striking) return;
      dispatch({ type: 'STRIKE', index: i });
      setTimeout(() => {
        dispatch({ type: 'COMPLETE', index: i });
        const after = stateRef.current.slots.map((x, idx) =>
          idx === i && x ? { ...x, done: true } : x,
        );
        if (after.every((x) => x && x.done)) setTimeout(() => win(), 380);
      }, 520);
    },
    [win],
  );

  const drop = useCallback(() => {
    const { drag, overSlot, slots, dayLocked } = stateRef.current;
    if (drag && overSlot != null && !slots[overSlot] && !dayLocked) {
      const target = overSlot;
      const filled = slots.filter(Boolean).length + 1;
      dispatch({ type: 'DROP' });
      setTimeout(() => dispatch({ type: 'CLEAR_JUST_PLACED', index: target }), 560);
      if (filled === 3) {
        dispatch({ type: 'SET_LOCKING' });
        setTimeout(() => dispatch({ type: 'FINISH_LOCK' }), 720);
      }
    } else {
      dispatch({ type: 'CANCEL_DRAG' });
    }
  }, []);

  const enterFocus = useCallback((i: number) => dispatch({ type: 'ENTER_FOCUS', index: i }), []);

  const focusComplete = useCallback(() => {
    const i = stateRef.current.focusIndex;
    dispatch({ type: 'EXIT_FOCUS' });
    if (i != null) complete(i);
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
      const id = 'q' + nid.current++;
      dispatch({ type: 'FLY_START', text: t });
      requestAnimationFrame(() =>
        requestAnimationFrame(() => dispatch({ type: 'FLY_END' })),
      );
      setTimeout(() => dispatch({ type: 'FLY_COMMIT', id, text: t }), 580);
    } else if (e.key === 'Escape') {
      dispatch({ type: 'CLOSE_CAPTURE' });
      dispatch({ type: 'SET_CAPTURE_TEXT', text: '' });
    }
  }, []);

  const startDrag = useCallback((e: React.PointerEvent, item: { id: string; text: string }) => {
    if (stateRef.current.dayLocked) return;
    e.preventDefault();
    dispatch({ type: 'START_DRAG', item, x: e.clientX, y: e.clientY });
  }, []);

  // --- Global listeners: pointer drag tracking, outside-click, resize ---
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!stateRef.current.drag) return;
      e.preventDefault();
      let over: number | null = null;
      let n: Element | null = document.elementFromPoint(e.clientX, e.clientY);
      while (n) {
        const slotAttr = (n as HTMLElement).dataset?.slot;
        if (slotAttr != null) {
          over = +slotAttr;
          break;
        }
        n = n.parentElement;
      }
      if (over != null && (stateRef.current.slots[over] || stateRef.current.dayLocked)) over = null;
      dispatch({ type: 'DRAG_MOVE', x: e.clientX, y: e.clientY, overSlot: over });
    };
    const onUp = () => {
      if (stateRef.current.drag) drop();
    };
    const onDocDown = (e: PointerEvent) => {
      if (!stateRef.current.captureOpen) return;
      const target = e.target as HTMLElement;
      if (target.closest && target.closest('[data-capture]')) return;
      dispatch({ type: 'CLOSE_CAPTURE' });
    };
    const onResize = () => dispatch({ type: 'SET_COMPACT', compact: window.innerWidth < 720 });

    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointerdown', onDocDown, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointerdown', onDocDown, true);
      window.removeEventListener('resize', onResize);
    };
  }, [drop]);

  // --- Pomodoro interval ---
  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearInterval(id);
  }, []);

  // --- Date rollover while the app is open ---
  useEffect(() => {
    const check = () => {
      if (stateRef.current.dayDate !== todayStr()) dispatch({ type: 'NEW_DAY', date: todayStr() });
    };
    const id = setInterval(check, 60_000);
    const onVis = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const actions = {
    dispatch,
    startDrag,
    complete,
    enterFocus,
    focusComplete,
    openCapture,
    onCapKey,
    setCaptureText: (text: string) => dispatch({ type: 'SET_CAPTURE_TEXT', text }),
    removeQueue: (id: string) => dispatch({ type: 'REMOVE_QUEUE', id }),
    openQueue: () => dispatch({ type: 'OPEN_QUEUE' }),
    closeQueue: () => dispatch({ type: 'CLOSE_QUEUE' }),
    toggleQueue: () => dispatch({ type: 'TOGGLE_QUEUE' }),
    exitFocus: () => dispatch({ type: 'EXIT_FOCUS' }),
    focusToggle: () => dispatch({ type: 'FOCUS_TOGGLE' }),
    focusReset: () => dispatch({ type: 'FOCUS_RESET' }),
    logout: () => {
      /* stub — wire to your real session */
    },
    inputRef,
  };

  return { state, actions };
}
