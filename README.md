# Today — Daily Focus

A faithful React + TypeScript recreation of the `design_handoff_daily_focus` spec: a
single-screen daily-planning app. Each morning you drag **exactly three** goals from the
Queue into Today; filling the third slot locks the day. Completing all three "wins the day."
A per-task **Focus mode** provides an iPhone-style Now Playing card plus an auto-cycling
Pomodoro timer (25 min focus → 5 min break → repeat).

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build
```

## Structure

| File | Responsibility |
|---|---|
| `src/types.ts` | Domain types + timer constants (`FOCUS_TOTAL`, `BREAK_TOTAL`) |
| `src/reducer.ts` | Pure state transitions (all `AppState` changes) |
| `src/useToday.ts` | Hook: wires the reducer to timers, pointer-drag listeners, capture, date-rollover, and `localStorage` persistence |
| `src/util.ts` | `MM:SS` formatting, date string, side padding, slot labels |
| `src/App.tsx` | Layout + derived view values (padding, prompt visibility, focus elapsed) |
| `src/components/` | `TopBar`, `TaskSlots`, `QueuePanel`, `CaptureBar`, `FocusMode`, `icons` |
| `src/index.css` | Design tokens (CSS vars), fonts, keyframes, hover affordances |

## Notes on the translation

- **Design tokens** (colors, 11px DM Mono, tracking, spacing, radii, easings) come straight
  from the handoff and live as CSS custom properties in `index.css`. Keyframes `settle`,
  `rollUp`, `wonIn`, `focusIn`, and `pulse` are ported verbatim.
- **State** is a single `useReducer` mirroring the prototype's logic class. Multi-step
  sequences that use `setTimeout` (strike → complete → win, drop → lock, capture fly) are
  orchestrated in `useToday`, keeping the reducer pure. A `stateRef` lets document-level
  listeners read current state without re-subscribing.
- **Drag-and-drop** uses the prototype's dependency-free approach: pointer events +
  `document.elementFromPoint` to resolve the hovered slot, a floating ghost chip, and a 2px
  ink underline on the target row.
- **Persistence** (added — the prototype was in-memory): slots, queue, day number/date, and
  lock/won flags persist to `localStorage`. On a date change (rollover, or when the tab
  regains focus) unfinished tasks return to the queue and a fresh day starts.
- **Log out** is a stub (`actions.logout`) — wire it to your real session.
- The top-right primary button reads **"Add work"** and the capture placeholder **"A work
  for later"**, matching the prototype markup and screenshots (the handoff prose called this
  "Capture"; the visual source of truth won).
