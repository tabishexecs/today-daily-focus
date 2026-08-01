import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { useMutation, useQuery } from 'convex/react';
import type { OptimisticLocalStore } from 'convex/browser';
import { api } from '../convex/_generated/api';
import { reducer } from './reducer';
import { FOCUS_TOTAL } from './types';
import type { Note, NoteId, StoredTask, Task, TaskId, UiState } from './types';

/**
 * Which task sat at the centre of the band when we last stopped scrolling. Stored as an id,
 * not a pixel offset, so it survives a breakpoint change and keeps pointing at the same task
 * when work is added above it.
 *
 * This is the one thing still kept in `localStorage`: it is where *this* screen is looking,
 * so syncing it would make one device scroll another. Namespaced by Clerk user id so two
 * accounts in the same browser keep separate positions. Tasks themselves live in Convex; the
 * old `today.v2:<userId>` task payloads are not read or migrated.
 */
const anchorKey = (userId: string) => `today.v2:${userId}.anchor`;

function readAnchor(userId: string): string | null {
  try {
    return localStorage.getItem(anchorKey(userId));
  } catch {
    return null;
  }
}

/**
 * Ids minted client-side for a task that has been captured but not yet acknowledged by the
 * server. They are never real document ids, so anything that would send one back to Convex
 * checks this first rather than failing validation a moment later.
 */
const optimisticId = () => `optimistic:${crypto.randomUUID()}` as TaskId;
const isOptimistic = (id: TaskId) => id.startsWith('optimistic:');

function initialUiState(): UiState {
  return {
    striking: [],
    captureOpen: false,
    captureText: '',
    focusId: null,
    focusRunning: false,
    focusPhase: 'focus',
    focusLeft: FOCUS_TOTAL,
    compact: typeof window !== 'undefined' && window.innerWidth < 720,
  };
}

/**
 * @param userId Clerk user id, used only for the scroll anchor key. Task scoping is the
 *   server's job now — `api.tasks.*` reads the subject off the verified JWT, so the browser
 *   never names the account whose rows it wants. The caller still remounts this hook's owner
 *   on change (via `key`), which resets in-flight UI state on an account switch.
 */
export function useToday(userId: string) {
  const [state, dispatch] = useReducer(reducer, undefined, initialUiState);

  // `undefined` while the first result is in flight; every later change to the stream —
  // including one made on another device — pushes a new array through here.
  const stored = useQuery(api.tasks.list);
  const loading = stored === undefined;

  // Optimistic updates keep every interaction instant: the round trip is short, but the
  // strike animation and the capture bar both read as broken if the list waits for it.
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

  // Notes belong to the focused task, so nothing is subscribed until there is one — and not
  // to a task the server has never seen, whose id would fail validation.
  const noteTaskId =
    state.focusId != null && !isOptimistic(state.focusId) ? state.focusId : undefined;
  const storedNotes = useQuery(api.notes.forTask, noteTaskId ? { taskId: noteTaskId } : 'skip');
  const notes: Note[] = useMemo(() => storedNotes ?? [], [storedNotes]);

  // Keep refs to the latest values so document-level listeners and timeouts read current
  // state without re-subscribing.
  const stateRef = useRef(state);
  stateRef.current = state;
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  const inputRef = useRef<HTMLInputElement | null>(null);
  // Read once: after mount the stream owns the live scroll position.
  const initialAnchorId = useRef(readAnchor(userId)).current;

  /**
   * Rewrites the focused task's note list in the local cache. The mutations below carry only
   * a note id, so the query to patch is the one for whatever task is in focus — the only
   * note list on screen, and the only one they can be called from.
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

  // Without this the note would jump back to where it was picked up for the length of the
  // round trip, since the card follows the stored position once the drag ends.
  const moveNoteTo = useMutation(api.notes.move).withOptimisticUpdate((store, { id, x, y }) =>
    patchNotes(store, (notes) => notes.map((n) => (n.id === id ? { ...n, x, y } : n))),
  );

  // Same reasoning as `move`: the card follows the stored geometry once the handle is let go.
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

  // --- Multi-step orchestrations (timeouts live here, not in the reducer) ---

  // Note text is written a beat after typing stops rather than per keystroke. `pendingNotes`
  // holds the last text typed into each edited note, so every path that leaves the notes —
  // exiting focus, closing the tab, unmounting — can send them early instead of dropping them.
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
      // A note can be deleted mid-edit (another tab, another device, the × on this one).
      // Losing its text is the right outcome there; an unhandled rejection is not.
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
      // Drop any unwritten text for this note rather than resurrecting it after the delete.
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
    dispatch({ type: 'EXIT_FOCUS' });
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
    dispatch({ type: 'ENTER_FOCUS', id });
  }, []);

  const focusComplete = useCallback(() => {
    const id = stateRef.current.focusId;
    flushNotes();
    dispatch({ type: 'EXIT_FOCUS' });
    if (id != null) complete(id);
  }, [complete, flushNotes]);

  const removeTask = useCallback(
    (id: TaskId) => {
      if (isOptimistic(id)) return;
      if (stateRef.current.focusId === id) {
        // Drop the pending note text instead of flushing it: the task, and with it every
        // note on it, is about to be gone.
        pendingNotes.current.clear();
        dispatch({ type: 'EXIT_FOCUS' });
      }
      void deleteTask({ id });
    },
    [deleteTask],
  );

  const openCapture = useCallback(() => {
    dispatch({ type: 'OPEN_CAPTURE' });
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const onCapKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        const text = (stateRef.current.captureText || '').trim();
        dispatch({ type: 'CLOSE_CAPTURE' });
        dispatch({ type: 'SET_CAPTURE_TEXT', text: '' });
        if (text) void addTask({ text });
      } else if (e.key === 'Escape') {
        dispatch({ type: 'CLOSE_CAPTURE' });
        dispatch({ type: 'SET_CAPTURE_TEXT', text: '' });
      }
    },
    [addTask],
  );

  // The focused task can vanish under us — deleted on another device, or on this one from a
  // second tab. Without this the card unmounts (App can't find it) while the timer keeps
  // running against an id that no longer exists.
  useEffect(() => {
    if (loading || state.focusId == null) return;
    if (!tasks.some((t) => t.id === state.focusId)) dispatch({ type: 'EXIT_FOCUS' });
  }, [loading, state.focusId, tasks]);

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

  // A note being typed as the tab closes or the account switches still has to land. Read the
  // flush through a ref so the effect can stay mounted for the hook's whole life.
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
    removeTask,
    saveAnchor,
    addNote,
    setNoteText,
    moveNote,
    resizeNote,
    removeNote,
    exitFocus,
    focusToggle: () => dispatch({ type: 'FOCUS_TOGGLE' }),
    focusReset: () => dispatch({ type: 'FOCUS_RESET' }),
    inputRef,
  };

  return { state, tasks, notes, loading, actions, initialAnchorId };
}
