# Today — Daily Focus

A single-screen React + TypeScript app for working through one list, three tasks at a time.
Every task lives in one stream; only the three inside the **band** are legible at rest, and
everything above and below fades to a ghost. Scrolling brings the whole list up to full
legibility so you can navigate; when you stop, the three you landed on light up and the rest
recede. A per-task **Focus mode** provides an iPhone-style Now Playing card plus an
auto-cycling Pomodoro timer (25 min focus → 5 min break → repeat).

Originally a recreation of the `design_handoff_daily_focus` spec, which framed the app around
dragging exactly three goals from a Queue sidebar into Today and locking the day. That model
is gone: there is no sidebar, no commitment step, and no day lock — see *Direction change*
below.

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
| `src/useToday.ts` | Hook: wires the reducer to the Pomodoro timer, capture, outside-click dismissal, and `localStorage` persistence |
| `src/util.ts` | `MM:SS` formatting, date string, side padding |
| `src/App.tsx` | Layout + derived view values |
| `src/components/` | `TopBar`, `TaskStream`, `CaptureBar`, `FocusMode`, `icons` |
| `src/index.css` | Design tokens (CSS vars), fonts, keyframes, hover affordances |

## How the stream works

`TaskStream` is a native scroller exactly `VIS` rows tall (7 on desktop, 5 compact) with
`scroll-snap-type: y mandatory` and `scroll-snap-align: center` on every row. Leading and
trailing padding of `(VIS - 3) / 2` rows does two jobs: it lets the first and last tasks reach
the band, and it makes `scrollTop: 0` a valid snap position whose band is rows 0–2. Snap
positions therefore land at `(i - 1) * rowHeight`, so a settled band is always exactly three
aligned rows — at the very bottom, the last three.

Opacity comes from each row's distance from the band's centre line, measured in rows: 0 and 1
are in-band, 2 is the near ghost (12%), beyond that 6%. Rows outside the band also get
`pointer-events: none`, so nothing you can't read is clickable.

While scrolling, every row goes to full opacity and two hairline **band guides** fade in to
show where things will land — the fade alone can't communicate that mid-scroll. Both revert
once scrolling settles (a 200 ms idle debounce; `scrollend` isn't universally supported yet).
Because the scrolling state is uniform, position is only read on settle, so a scroll gesture
costs one re-render rather than one per frame.

Row height is fixed so the band maths needs no DOM measurement; task text clamps to two lines.

## Notes

- **Design tokens** (colors, 11px DM Mono, tracking, spacing, radii, easings) come from the
  handoff and live as CSS custom properties in `index.css`. Keyframes `settle`, `rollUp`,
  `wonIn`, `focusIn`, and `pulse` are ported verbatim; `settle`, `rollUp`, and `wonIn` are
  currently unused, left in place as tokens.
- **State** is a single `useReducer`. The one multi-step sequence (strike → complete) is
  orchestrated in `useToday` with a `setTimeout`, keeping the reducer pure. A `stateRef` lets
  document-level listeners read current state without re-subscribing.
- **Persistence**: the task list persists to `localStorage` under `today.v2` as `{ tasks }`.
  v1 payloads (separate `slots` and `queue`) are deliberately not read — the key was bumped
  and the seed list repopulates.
- **Scroll position survives reload** via `today.v2.anchor`, which holds the *id* of the task
  the band was centred on, not a pixel offset — so it restores correctly across a breakpoint
  change and keeps naming the same task when work is added above it. Written on scroll settle
  and whenever the list changes; applied in a `useLayoutEffect` before the first paint, so
  there is no visible jump from the top. A stale id (task since deleted) falls back to the top
  and self-heals on the next write.
- **Capture** floats as a rounded white card above the bottom edge; Enter adds to the top of
  the stream and the stream scrolls up to meet it, Escape or a click outside dismisses.
- **Log out** is a stub (`actions.logout`) — wire it to your real session.
- The top-right primary button reads **"Add work"** and the capture placeholder **"A work for
  later"**, matching the prototype markup and screenshots (the handoff prose called this
  "Capture"; the visual source of truth won).

## Direction change

The Queue-as-sidebar model was removed deliberately. With it went the whole day-commitment
layer, since the visible three are now just a reading window rather than a promise:

- `slots` + `queue` merged into one ordered `tasks[]`
- Dropped: `dayLocked`, `locking`, `dayWon`, `rolling`, `dayNumber`/`dayDate`, the date
  rollover that returned unfinished tasks to the queue, and `DAY WON`
- Dropped: all drag-and-drop (pointer tracking, `document.elementFromPoint` slot resolution,
  the ghost chip, drop underline) — scrolling replaced dragging as the way work surfaces
- Completed tasks stay in place, struck through and muted. Nothing archives them yet.
