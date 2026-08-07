import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import type { OptimisticLocalStore } from 'convex/browser';
import { api } from '../convex/_generated/api';
import { playChime, unlockChime } from './chime';
import { reducer } from './reducer';
import { focusElapsedMs, PHASE_MS } from './types';
import type { Note, NoteId, PanelPos, PomoPhase, StoredTask, Task, TaskId, UiState } from './types';

/**
 * Which task the band was centred on last. An id rather than a pixel offset, so it survives a
 * breakpoint change and keeps pointing at the same task when work is added above it.
 *
 * This and the panel position below are the only things still in `localStorage`: both describe
 * where *this* screen is looking, so syncing them would make one device scroll another. Keyed
 * by Clerk user id so two accounts in a browser stay separate.
 */
const anchorKey = (userId: string) => `today.v2:${userId}.anchor`;

function readAnchor(userId: string): string | null {
  try {
    return localStorage.getItem(anchorKey(userId));
  } catch {
    return null;
  }
}

const panelKey = (userId: string) => `today.v2:${userId}.pomodoro`;

/** Anything at all can be under a storage key, so the stored pair is checked, not cast. */
function readPanelPos(userId: string): PanelPos | null {
  try {
    const raw = localStorage.getItem(panelKey(userId));
    if (!raw) return null;
    const { x, y } = JSON.parse(raw) as Record<string, unknown>;
    if (typeof x !== 'number' || typeof y !== 'number') return null;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    // Fractions of the window: anything outside that never described a position on screen.
    return { x: Math.min(Math.max(x, 0), 1), y: Math.min(Math.max(y, 0), 1) };
  } catch {
    return null;
  }
}

/**
 * Ids minted for a task captured but not yet acknowledged by the server. They are never real
 * document ids, so anything that would send one back to Convex checks this first.
 */
const optimisticId = () => `optimistic:${crypto.randomUUID()}` as TaskId;
const isOptimistic = (id: TaskId) => id.startsWith('optimistic:');

function initialUiState(userId: string): UiState {
  return {
    striking: [],
    captureOpen: false,
    captureText: '',
    focusId: null,
    focusTimerId: null,
    focusStartedAt: null,
    focusBaseMs: 0,
    pomodoroPos: readPanelPos(userId),
    compact: typeof window !== 'undefined' && window.innerWidth < 720,
  };
}

/** What `api.pomodoro.get` returns once the row exists. */
interface PomoRow {
  phase: PomoPhase;
  endsAt: number | null;
  leftMs: number;
  done: number;
}

/**
 * Stood in for the row until the first press creates it, and by the optimistic updates below,
 * which have to answer for a clock nobody has started yet.
 *
 * Paused at a full pomodoro: the panel is on screen from the first paint, and a clock that
 * started itself would be counting down something nobody had asked for.
 */
const UNSTARTED: PomoRow = { phase: 'focus', endsAt: null, leftMs: PHASE_MS.focus, done: 0 };

/** What the panel is given: the row, resolved against a clock. */
export interface PomoView {
  phase: PomoPhase;
  /** Seconds still to go in `phase`. */
  left: number;
  running: boolean;
}

/**
 * How often the clocks are re-read, which is not the same thing as how fast they run — they
 * run on their own and this only decides how soon the screen catches up.
 *
 * Four times the second being displayed. Sampling at the display's own rate would let a
 * countdown hold one number for two ticks and skip the next, because the sample points and the
 * second boundaries drift against each other. Nothing accumulates here, so an interval that is
 * throttled, delayed or skipped entirely costs a late repaint and never a lost second.
 */
const SAMPLE_MS = 250;

/**
 * @param userId Clerk user id, used only to key what this browser keeps to itself. Task
 *   scoping is the server's: `api.tasks.*` reads the subject off the verified JWT, so the
 *   browser never names the account whose rows it wants.
 */
export function useToday(userId: string) {
  const [state, dispatch] = useReducer(reducer, userId, initialUiState);

  // `undefined` while the first result is in flight; every later change — including one made
  // on another device — pushes a new array through here.
  const stored = useQuery(api.tasks.list);
  const loading = stored === undefined;

  // Optimistic updates keep every interaction instant: the round trip is short, but the strike
  // animation and the capture bar both read as broken if the list waits for it.
  const addTask = useMutation(api.tasks.add).withOptimisticUpdate((store, { text }) => {
    const current = store.getQuery(api.tasks.list, {});
    if (current === undefined) return;
    const optimistic: StoredTask = { id: optimisticId(), text: text.trim(), done: false };
    store.setQuery(api.tasks.list, {}, [optimistic, ...current]);
  });

  const completeTask = useMutation(api.tasks.complete).withOptimisticUpdate((store, { id }) => {
    const current = store.getQuery(api.tasks.list, {});
    if (current === undefined) return;
    store.setQuery(
      api.tasks.list,
      {},
      current.map((t) => (t.id === id ? { ...t, done: true } : t)),
    );
  });

  const deleteTask = useMutation(api.tasks.remove).withOptimisticUpdate((store, { id }) => {
    const current = store.getQuery(api.tasks.list, {});
    if (current === undefined) return;
    store.setQuery(
      api.tasks.list,
      {},
      current.filter((t) => t.id !== id),
    );
  });

  /** The server's list joined with the local strike animation. */
  const tasks: Task[] = useMemo(
    () => (stored ?? []).map((t) => ({ ...t, striking: state.striking.includes(t.id) })),
    [stored, state.striking],
  );

  // Notes belong to the focused task, so nothing is subscribed until there is one — and not to
  // a task the server has never seen, whose id would fail validation.
  const noteTaskId =
    state.focusId != null && !isOptimistic(state.focusId) ? state.focusId : undefined;
  const storedNotes = useQuery(api.notes.forTask, noteTaskId ? { taskId: noteTaskId } : 'skip');
  const notes: Note[] = useMemo(() => storedNotes ?? [], [storedNotes]);

  // Refs to the latest values, so document-level listeners and timeouts read current state
  // without re-subscribing.
  const stateRef = useRef(state);
  stateRef.current = state;
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  const inputRef = useRef<HTMLInputElement | null>(null);
  // Read once: after mount the stream owns the live scroll position.
  const initialAnchorId = useRef(readAnchor(userId)).current;

  // --- The clocks ---

  const pomoRow = useQuery(api.pomodoro.get) ?? null;

  /**
   * Server time minus this browser's, learned from any mutation's reply.
   *
   * `endsAt` is written on the server's clock and read against this one, and nothing guarantees
   * they agree — a device an hour out would draw an hour-wrong pomodoro. Kept in state so a
   * correction repaints, and mirrored into a ref because the optimistic updates below run
   * outside render and would otherwise close over whatever it was when they were built.
   */
  const [skew, setSkew] = useState(0);
  const skewRef = useRef(skew);
  skewRef.current = skew;

  const syncClock = useMutation(api.pomodoro.sync);
  const learnSkew = useCallback((serverNow: number) => setSkew(serverNow - Date.now()), []);

  // Once, on mount. A pomodoro left running on another device is already counting when this
  // tab opens, and there is no press coming to correct the offset before it has to be drawn.
  useEffect(() => {
    void syncClock({})
      .then((r) => learnSkew(r.now))
      // A failed sync leaves the offset at zero, which is the old behaviour: the local clock,
      // believed. Not worth a visible error — every later press gets another chance at it.
      .catch(() => {});
  }, [syncClock, learnSkew]);

  const togglePomo = useMutation(api.pomodoro.toggle).withOptimisticUpdate((store) => {
    // `undefined` is "not loaded", `null` is "loaded, never started" — only the first is a
    // reason to show nothing.
    const current = store.getQuery(api.pomodoro.get, {});
    if (current === undefined) return;
    const row = current ?? UNSTARTED;
    const now = Date.now() + skewRef.current;
    store.setQuery(
      api.pomodoro.get,
      {},
      row.endsAt === null
        ? { ...row, endsAt: now + row.leftMs }
        : { ...row, endsAt: null, leftMs: Math.max(0, row.endsAt - now) },
    );
  });

  const resetPomo = useMutation(api.pomodoro.reset).withOptimisticUpdate((store) => {
    const current = store.getQuery(api.pomodoro.get, {});
    if (current === undefined) return;
    const row = current ?? UNSTARTED;
    store.setQuery(api.pomodoro.get, {}, { ...row, endsAt: null, leftMs: PHASE_MS[row.phase] });
  });

  const advancePomo = useMutation(api.pomodoro.advance);

  /**
   * The repaint pulse: a counter with no meaning of its own, bumped to say "read the clock
   * again". It is not a time, and nothing is drawn from it.
   *
   * Holding a sampled `now` here instead is subtly wrong, and was wrong on screen. Nothing
   * samples while both clocks are stopped — that is the point of the gate below — so the stored
   * reading goes stale by however long the panel sits paused. The render that *starts* a clock
   * then held a deadline taken from the live clock against a reading minutes older, and drew a
   * phase longer than any phase is, for the one frame before an effect could correct it.
   */
  const [pulse, resample] = useReducer((n: number) => n + 1, 0);

  const pomoRunning = pomoRow?.endsAt != null;
  const ticking = pomoRunning || state.focusStartedAt !== null;

  // No interval at all while both clocks are stopped, which is most of the time a panel that is
  // never dismissed spends on screen. `visibilitychange` is what makes a returning tab right
  // immediately rather than one sample later, since a hidden tab's interval may have been
  // throttled to once a minute.
  //
  // Nothing needs pulsing as this starts: the render that flipped `ticking` read the clock
  // itself, like every other render does.
  useEffect(() => {
    if (!ticking) return;
    const id = window.setInterval(() => resample(), SAMPLE_MS);
    const onVisible = () => resample();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [ticking]);

  /**
   * Read here, during the render that draws it, rather than sampled into state beforehand — a
   * time being held against a deadline has to be at least as new as the deadline it is
   * measuring. This is what makes the pulse above only a pulse.
   */
  const nowMs = Date.now();

  const pomoNow = pomoRow ?? UNSTARTED;
  const pomoLeftMs =
    pomoNow.endsAt === null ? pomoNow.leftMs : Math.max(0, pomoNow.endsAt - (nowMs + skew));
  const pomo: PomoView = {
    phase: pomoNow.phase,
    left: Math.ceil(pomoLeftMs / 1000),
    running: pomoNow.endsAt !== null,
  };

  /**
   * Seconds on the focused task, from the same reading. No `skew`: this stopwatch never leaves
   * the browser, so both of its ends are on the one clock.
   */
  const focusElapsed = Math.floor(focusElapsedMs(state, nowMs) / 1000);

  /**
   * Ask the server to hand over once the deadline has passed here. The server checks it again
   * against its own clock and ignores us if it disagrees, so this is a nudge rather than the
   * decision — which is what lets a second tab, or a laptop opened hours later, fire the same
   * request harmlessly.
   *
   * The ref keeps one request per deadline: the sampler runs four times a second and the reply
   * takes longer than that, so without it a slow round trip would be asked for repeatedly.
   */
  const askedFor = useRef<number | null>(null);
  useEffect(() => {
    const endsAt = pomoRow?.endsAt;
    // `pulse` is in the deps as the re-check trigger; the clock is read here, for the same
    // reason the render reads it there.
    if (endsAt == null || Date.now() + skewRef.current < endsAt || askedFor.current === endsAt)
      return;
    askedFor.current = endsAt;
    void advancePomo({ durations: PHASE_MS })
      .then((r) => learnSkew(r.now))
      // Offline, most likely. Clearing the mark lets the next sample try again.
      .catch(() => {
        askedFor.current = null;
      });
  }, [pomoRow, pulse, advancePomo, learnSkew]);

  /**
   * Rewrites the focused task's note list in the local cache. The mutations below carry only a
   * note id, so the query to patch is the one for whatever task is in focus.
   */
  const patchNotes = useCallback((store: OptimisticLocalStore, fn: (notes: Note[]) => Note[]) => {
    const taskId = stateRef.current.focusId;
    if (taskId == null || isOptimistic(taskId)) return;
    const current = store.getQuery(api.notes.forTask, { taskId });
    if (current === undefined) return;
    store.setQuery(api.notes.forTask, { taskId }, fn(current));
  }, []);

  // No optimistic update on create: the server picks the id and the position, so there is
  // nothing truthful to show until it answers.
  const createNote = useMutation(api.notes.add);

  const saveNoteText = useMutation(api.notes.setText).withOptimisticUpdate((store, { id, text }) =>
    patchNotes(store, (notes) => notes.map((n) => (n.id === id ? { ...n, text } : n))),
  );

  // Without these the card would jump back to where the gesture started for the length of the
  // round trip, since it follows the stored geometry once the pointer is released.
  const moveNoteTo = useMutation(api.notes.move).withOptimisticUpdate((store, { id, x, y }) =>
    patchNotes(store, (notes) => notes.map((n) => (n.id === id ? { ...n, x, y } : n))),
  );

  const resizeNoteTo = useMutation(api.notes.resize).withOptimisticUpdate(
    (store, { id, x, y, w, h }) =>
      patchNotes(store, (notes) => notes.map((n) => (n.id === id ? { ...n, x, y, w, h } : n))),
  );

  const deleteNote = useMutation(api.notes.remove).withOptimisticUpdate((store, { id }) =>
    patchNotes(store, (notes) => notes.filter((n) => n.id !== id)),
  );

  const saveAnchor = useCallback(
    (id: string | null) => {
      try {
        if (id) localStorage.setItem(anchorKey(userId), id);
        else localStorage.removeItem(anchorKey(userId));
      } catch {
        /* ignore quota / privacy-mode errors */
      }
    },
    [userId],
  );

  /** Called once when the panel is dropped, so the write is per drag rather than per frame. */
  const movePomodoro = useCallback(
    (x: number, y: number) => {
      dispatch({ type: 'MOVE_POMODORO', x, y });
      try {
        localStorage.setItem(panelKey(userId), JSON.stringify({ x, y }));
      } catch {
        /* ignore quota / privacy-mode errors */
      }
    },
    [userId],
  );

  /**
   * The play/pause the alarm is downstream of. The browser will not let a page make a sound
   * until it has been touched, so the gesture that starts the clock is also what gives the
   * chime a voice — twenty-five minutes ahead of it being needed.
   */
  const pomoToggle = useCallback(() => {
    unlockChime();
    void togglePomo({ durations: PHASE_MS })
      .then((r) => learnSkew(r.now))
      .catch(() => {});
  }, [togglePomo, learnSkew]);

  const pomoReset = useCallback(() => {
    void resetPomo({ durations: PHASE_MS })
      .then((r) => learnSkew(r.now))
      .catch(() => {});
  }, [resetPomo, learnSkew]);

  // --- Multi-step orchestrations (timeouts live here, not in the reducer) ---

  // Note text is written a beat after typing stops. `pendingNotes` holds the last text typed
  // into each edited note, so every path that leaves the notes — exiting focus, closing the
  // tab, unmounting — can send them early instead of dropping them.
  const noteTimer = useRef<number | null>(null);
  const pendingNotes = useRef(new Map<NoteId, string>());

  const flushNotes = useCallback(() => {
    if (noteTimer.current !== null) {
      clearTimeout(noteTimer.current);
      noteTimer.current = null;
    }
    const pending = [...pendingNotes.current];
    pendingNotes.current.clear();
    for (const [id, text] of pending) {
      // A note can be deleted mid-edit. Losing its text is the right outcome there; an
      // unhandled rejection is not.
      void saveNoteText({ id, text }).catch(() => {});
    }
  }, [saveNoteText]);

  const setNoteText = useCallback(
    (id: NoteId, text: string) => {
      pendingNotes.current.set(id, text);
      if (noteTimer.current !== null) clearTimeout(noteTimer.current);
      noteTimer.current = window.setTimeout(flushNotes, 600);
    },
    [flushNotes],
  );

  const addNote = useCallback(() => {
    const id = stateRef.current.focusId;
    if (id == null || isOptimistic(id)) return;
    void createNote({ taskId: id });
  }, [createNote]);

  const removeNote = useCallback(
    (id: NoteId) => {
      // Drop any unwritten text rather than resurrecting it after the delete.
      pendingNotes.current.delete(id);
      void deleteNote({ id });
    },
    [deleteNote],
  );

  /** Both are called once on release, not per pointer move. */
  const moveNote = useCallback(
    (id: NoteId, x: number, y: number) => {
      void moveNoteTo({ id, x, y }).catch(() => {});
    },
    [moveNoteTo],
  );

  const resizeNote = useCallback(
    (id: NoteId, x: number, y: number, w: number, h: number) => {
      void resizeNoteTo({ id, x, y, w, h }).catch(() => {});
    },
    [resizeNoteTo],
  );

  const exitFocus = useCallback(() => {
    flushNotes();
    dispatch({ type: 'EXIT_FOCUS', now: Date.now() });
  }, [flushNotes]);

  /** Strike through locally, then write the completion once the line finishes drawing. */
  const complete = useCallback(
    (id: TaskId) => {
      const t = tasksRef.current.find((x) => x.id === id);
      if (!t || t.done || t.striking || isOptimistic(id)) return;
      dispatch({ type: 'STRIKE', id });
      setTimeout(() => {
        // The optimistic update flips `done` as the strike clears, so the line stays drawn.
        void completeTask({ id });
        dispatch({ type: 'STRIKE_DONE', id });
      }, 520);
    },
    [completeTask],
  );

  const enterFocus = useCallback((id: TaskId) => {
    const t = tasksRef.current.find((x) => x.id === id);
    if (!t || t.done || isOptimistic(id)) return;
    dispatch({ type: 'ENTER_FOCUS', id, now: Date.now() });
  }, []);

  const focusComplete = useCallback(() => {
    const id = stateRef.current.focusId;
    flushNotes();
    dispatch({ type: 'EXIT_FOCUS', now: Date.now() });
    if (id != null) complete(id);
  }, [complete, flushNotes]);

  const removeTask = useCallback(
    (id: TaskId) => {
      if (isOptimistic(id)) return;
      if (stateRef.current.focusId === id) {
        // Don't flush: the task, and with it every note on it, is about to be gone.
        pendingNotes.current.clear();
        dispatch({ type: 'EXIT_FOCUS', now: Date.now() });
      }
      void deleteTask({ id });
    },
    [deleteTask],
  );

  const openCapture = useCallback(() => {
    dispatch({ type: 'OPEN_CAPTURE' });
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const closeCapture = useCallback(() => {
    dispatch({ type: 'CLOSE_CAPTURE' });
    dispatch({ type: 'SET_CAPTURE_TEXT', text: '' });
  }, []);

  // Reachable from the Enter key and from the keycap that stands for it.
  const submitCapture = useCallback(() => {
    const text = (stateRef.current.captureText || '').trim();
    closeCapture();
    if (text) void addTask({ text });
  }, [addTask, closeCapture]);

  const onCapKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') submitCapture();
      else if (e.key === 'Escape') closeCapture();
    },
    [submitCapture, closeCapture],
  );

  // The focused task can vanish under us — deleted on another device, or in a second tab.
  // Without this the card unmounts while the timer keeps running against a gone id.
  useEffect(() => {
    if (loading || state.focusId == null) return;
    if (!tasks.some((t) => t.id === state.focusId))
      dispatch({ type: 'EXIT_FOCUS', now: Date.now() });
  }, [loading, state.focusId, tasks]);

  // Outside-click to dismiss capture, and the compact breakpoint.
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

  // A note being typed as the tab closes still has to land. Read through a ref so the effect
  // can stay mounted for the hook's whole life.
  const flushRef = useRef(flushNotes);
  flushRef.current = flushNotes;
  useEffect(() => {
    const onHide = () => flushRef.current();
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      flushRef.current();
    };
  }, []);

  /**
   * The alarm. A phase only changes where one ran out, so the change is the event — and now
   * that the change is the server's, the sound follows a fact rather than a local countdown:
   * a tab that was asleep through the whole phase rings when it wakes and finds it over.
   *
   * `null` until the first row arrives, so loading a pomodoro mid-break is silent. Arriving at
   * a phase is not the same as watching one end.
   */
  const rungFor = useRef<PomoPhase | null>(null);
  useEffect(() => {
    if (pomoRow == null) return;
    const from = rungFor.current;
    rungFor.current = pomoRow.phase;
    if (from !== null && from !== pomoRow.phase) playChime(pomoRow.phase);
  }, [pomoRow]);

  const actions = {
    dispatch,
    complete,
    enterFocus,
    focusComplete,
    openCapture,
    onCapKey,
    submitCapture,
    setCaptureText: (text: string) => dispatch({ type: 'SET_CAPTURE_TEXT', text }),
    removeTask,
    saveAnchor,
    addNote,
    setNoteText,
    moveNote,
    resizeNote,
    removeNote,
    exitFocus,
    focusToggle: () => dispatch({ type: 'FOCUS_TOGGLE', now: Date.now() }),
    pomoToggle,
    pomoReset,
    movePomodoro,
    inputRef,
  };

  return { state, tasks, notes, loading, actions, initialAnchorId, pomo, focusElapsed };
}
