# Today — Daily Focus

A single-screen React + TypeScript app for working through one list, three tasks at a time.
Every task lives in one stream; only the three inside the **band** are legible at rest, and
everything above and below fades to a ghost. Scrolling brings the whole list up to full
legibility so you can navigate; when you stop, the three you landed on light up and the rest
recede. A per-task **Focus mode** provides an iPhone-style Now Playing card plus an
Pomodoro timer (25 min focus → 5 min break, and a 15 min long break after every fourth focus)
that chimes on every hand-over and waits on the play button before the next phase starts.

Originally a recreation of the `design_handoff_daily_focus` spec, which framed the app around
dragging exactly three goals from a Queue sidebar into Today and locking the day. That model
is gone: there is no sidebar, no commitment step, and no day lock — see *Direction change*
below.

## Run

```bash
npm install
cp .env.example .env.local   # then paste your Clerk publishable key
npx convex dev               # first run: logs in, provisions a deployment, generates types
npm run dev                  # http://localhost:5173  (in a second terminal)
npm run build                # type-check + production build to dist/
npm run preview              # serve the production build
```

Two processes in development: `npm run dev` (Vite) and `npm run dev:backend` (`convex dev`,
which watches `convex/` and pushes functions on save). The first `npx convex dev` also writes
`CONVEX_DEPLOYMENT` and `VITE_CONVEX_URL` into `.env.local` and creates `convex/_generated/`
— **nothing type-checks until it has run once**, since `src/types.ts` and `src/useToday.ts`
import from there. `_generated/` is committed; `.env.local` is gitignored.

`VITE_CLERK_PUBLISHABLE_KEY` is required — grab it from the
[Clerk dashboard](https://dashboard.clerk.com/~/api-keys) (choose **React**). Without it the
app fails to boot.

### Connecting Clerk to Convex

Convex verifies Clerk's JWT itself, so the two need to be introduced once:

1. In the Clerk dashboard, **JWT Templates → New template → Convex**. Leave the name as
   `convex` — `ConvexProviderWithClerk` requests that template by name, and
   `convex/auth.config.ts` matches on it via `applicationID`.
2. Copy the template's **Issuer** URL (the Frontend API URL, `https://<slug>.clerk.accounts.dev`).
3. Set it on the Convex deployment — this is a server-side variable, so it does *not* go in
   `.env.local`:

   ```bash
   npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<slug>.clerk.accounts.dev
   ```

Skipping this makes every query and mutation fail with `Not signed in`, because the token
arrives but Convex has no issuer to validate it against.

## Deploy

Deployed on Vercel (project `today-daily-focus`, framework preset Vite) at
<https://today-daily-focus-neon.vercel.app>. There is no Git integration, so production comes
from `vercel deploy --prod` rather than a push.

`VITE_CLERK_PUBLISHABLE_KEY` and `VITE_CONVEX_URL` are inlined at **build** time, so they must
exist in Vercel's environment, not just in your local `.env.local` — without them Vite
substitutes `undefined`, the provider throws on mount, and the deployed page renders blank
with no visible error. Add or rotate with:

```bash
vercel env add VITE_CLERK_PUBLISHABLE_KEY production
vercel env add VITE_CONVEX_URL production
vercel deploy --prod   # env changes only take effect on the next build
```

The Convex functions deploy separately from the frontend — `npx convex deploy` pushes
`convex/` to the production deployment. Its URL is what `VITE_CONVEX_URL` must point at, and
`CLERK_JWT_ISSUER_DOMAIN` has to be set on that deployment too (`npx convex env set`, or the
Convex dashboard), not only on the dev one.

The key in use is a Clerk **development** instance key (`pk_test_…`), so the deployed site
carries Clerk's development banner and dev-instance limits. Moving to a production instance
needs a custom domain — Clerk requires DNS records on a domain you control, which a
`*.vercel.app` subdomain can't provide.

## Structure

| File | Responsibility |
|---|---|
| `convex/schema.ts` | The `tasks`, `notes` and `pomodoro` tables + their indexes |
| `convex/tasks.ts` | `list` query, `add` / `complete` / `remove` mutations — all scoped to the caller |
| `convex/pomodoro.ts` | The clock: `get` / `sync` + `toggle` / `reset` / `advance`, one row per user |
| `convex/auth.config.ts` | Which Clerk instance's JWTs the backend trusts |
| `src/main.tsx` | Mounts the app inside `<ClerkProvider>` → `<ConvexProviderWithClerk>` |
| `src/types.ts` | Domain types + phase lengths (`FOCUS_TOTAL`, `BREAK_TOTAL`, `LONG_BREAK_TOTAL`, `PHASE_MS`) |
| `src/reducer.ts` | Pure UI state transitions (all `UiState` changes) |
| `src/useToday.ts` | Hook: joins the Convex query with local strike state, owns the mutations and their optimistic updates, the clock sampler, capture, and outside-click dismissal |
| `src/chime.ts` | The pomodoro's alarm — a struck bell per phase, synthesised in WebAudio |
| `src/util.ts` | `MM:SS` formatting, date string, side padding |
| `src/App.tsx` | Auth gate, then layout + derived view values |
| `src/components/` | `TopBar`, `TaskStream`, `CaptureBar`, `FocusMode`, `SignInScreen`, `icons` |
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

- **Design tokens** (colors, 14px Inter Tight — DM Mono on the focus screen — tracking, spacing,
  radii, easings) come from the
  handoff and live as CSS custom properties in `index.css`. Keyframes `settle`, `rollUp`,
  `wonIn`, `focusIn`, and `pulse` are ported verbatim; `settle`, `rollUp`, and `wonIn` are
  currently unused, left in place as tokens.
- **State** is split by lifetime. Convex owns the task list; `useReducer` owns everything
  transient (`UiState`: capture bar, focus session, strike animation, breakpoint). `useToday`
  joins them — `useQuery(api.tasks.list)` gives `StoredTask[]`, and each row is merged with
  whether its id is currently in `striking` to make the `Task` the stream renders. The one
  multi-step sequence (strike → complete) is orchestrated there with a `setTimeout`, keeping
  the reducer pure. A `stateRef` lets document-level listeners read current state without
  re-subscribing.
- **Persistence** is Convex. One `tasks` row per task, `userId` taken from the verified Clerk
  JWT server-side (`identity.subject`) rather than from any client argument, so the browser
  never names the account whose rows it wants. Ordering is `_creationTime` descending via the
  `by_user` index — there is no explicit position column. `striking` is never stored: it lasts
  520ms and belongs to the device that clicked.
- **Every mutation is optimistic.** `withOptimisticUpdate` writes the expected result into the
  query cache immediately, so capture, completion and delete land at input speed and the
  server catches up. A captured task therefore appears with a client-minted `optimistic:<uuid>`
  id for one round trip; that id is never a real document id, so `complete`, `removeTask` and
  `enterFocus` ignore ids with that prefix instead of sending them back and failing validation.
- **Loading is distinct from empty.** `useQuery` returns `undefined` until the first result
  arrives, which is not the same as an empty stream — `TaskStream` holds its height and shows
  nothing rather than flashing "NOTHING YET" at someone who has fifty tasks.
- **Nothing is migrated from `localStorage`.** The old `today.v2:<clerkUserId>` task payloads
  (and v1's `slots`/`queue` before them) are not read; an account starts from whatever is in
  Convex, which for a new one is empty.
- **Scroll position survives reload** via `today.v2:<clerkUserId>.anchor`, which holds the *id* of the task
  the band was centred on, not a pixel offset — so it restores correctly across a breakpoint
  change and keeps naming the same task when work is added above it. Written on scroll settle
  and whenever the list changes; applied in a `useLayoutEffect` before the first paint, so
  there is no visible jump from the top. A stale id (task since deleted) falls back to the top
  and self-heals on the next write. This and the pomodoro panel's position (`.pomodoro`) are
  all that is left in `localStorage`, and deliberately so: both describe where *this* screen is
  looking, so syncing them would let one device scroll or rearrange another.
- **Both clocks store a deadline, not a countdown.** The pomodoro is a `pomodoro` row holding
  `endsAt` (epoch ms, server clock) while it runs and `leftMs` while it is paused — which of
  the two is set is also what "running" means, so the state cannot contradict itself. The focus
  stopwatch is the same shape in `UiState` (`focusStartedAt` + `focusBaseMs`). Nothing
  accumulates and nothing has to be ticked: every displayed time is `now` minus a stored
  instant, worked out at the moment it is drawn.

  This is the whole reason the timer is correct in a background tab. The earlier version
  decremented a counter once per `setInterval` callback, which quietly defined elapsed time as
  *how often the browser chose to run us* — Chrome throttles a hidden tab's timers to one
  callback a minute after five minutes, and a sleeping machine runs none at all, so a pomodoro
  left in another tab lost roughly fifty-nine seconds in every minute and looked frozen. No
  amount of propping the interval up (a Web Worker, a held Web Lock, looping silent audio to
  stay "audible") fixes that, because none of them run while the lid is shut. Asking what time
  it is does.

  `setInterval` still exists, at 250 ms, but only as a **sampler**: it decides how soon the
  screen catches up, never what the clock says, so a throttled or skipped tick costs a late
  repaint and never a lost second. It runs only while something is actually counting, and a
  `visibilitychange` listener resyncs a returning tab immediately rather than one sample later.
- **The clock is the server's.** `endsAt` is written from Convex's `Date.now()`, so a reload,
  a crash, or a second device picks up the same running pomodoro. Because it is written on one
  clock and read against another, `pomodoro.sync` returns the server's time on mount and after
  every mutation, and the client holds the offset — otherwise a device whose clock is an hour
  out would draw an hour-wrong pomodoro, and be wrong silently.

  Because the clock now arrives over the network, the panel is on screen before there is
  anything true to put in it. `useQuery` has three states and the panel is given all three:
  `undefined` is "not here yet", `null` is "here, and never started". Only the second draws a
  full 25:00. During the first the panel shows `--:--` with no phase name, an indeterminate
  progress bar and both controls held — a refresh that drew a confident 25:00 and then took it
  back read as the timer having reset itself.
- **The pomodoro pauses at every hand-over.** A phase that runs out loads the next one and its
  full length, then stops: the chime says a phase ended, and the play button says the next one
  begins. A break that starts itself counts rest nobody has taken yet, and a focus that starts
  itself counts work nobody has come back to — neither number is true, and both are the ones
  the panel is showing.

  **Reset puts the whole set back**, not just the phase in progress: a full focus, paused, with
  the count of finished focuses cleared — the same state a clock that has never been started is
  in. It is the way out of a session that has gone wrong, and leaving three completed focuses
  behind would mean the next reset ran a long break nothing had earned. It rings nothing:
  resetting during a break moves the clock back to focus, which looks like a hand-over to the
  effect watching the phase, but a chime says a phase *ended* and this one was abandoned.

  The hand-over is `pomodoro.advance`, and it is the server that decides. A client asks for it
  when it notices the deadline has passed; the mutation re-checks against its own clock and
  does nothing if it disagrees, which is what makes the request safe to send from two tabs at
  once or from a laptop opened three hours later. It advances **exactly one phase per call**,
  never a catch-up run: coming back from lunch should find one break waiting, not a set of them
  counted through in your absence.
- **The alarm is synthesised, not a file** (`chime.ts`): a sine fundamental plus one bell
  partial, struck with a near-instant attack and left to decay. Each phase gets its own motif —
  the breaks fall, the return to focus rises, the long break falls furthest and rings longest —
  so what is starting is audible without looking. It hangs off the *phase change* in an effect,
  which keeps the reducer pure, and the browser's autoplay policy is answered by resuming the
  `AudioContext` from the panel's own controls: the click that starts the clock is the gesture
  that gives the chime a voice, twenty-five minutes ahead of it being needed. There is no mute
  — the panel holds two controls and the clock, and a timer only sounds while you have set it
  running.
- **The timer can be run fast in development.** `?fast` on the URL divides every phase by 60 —
  a 25s focus, a 5s break, a 15s long break — so the whole set and all five chimes can be
  watched and heard in about two minutes; `?fast=<n>` divides by `n` instead. It is read once,
  at load, and guarded by `import.meta.env.DEV`, so it is absent from a built app and no link
  can shorten a real pomodoro. Every phase length goes through `totalFor`, which is what makes
  one flag enough — including the `PHASE_MS` the client sends to `convex/pomodoro.ts`. The
  lengths travel with each mutation rather than being duplicated server-side precisely so that
  one flag still reaches the real clock; a server that owned the numbers would leave `?fast`
  shortening only the countdown this tab draws.
- **Capture** floats as a rounded white card above the bottom edge; Enter adds to the top of
  the stream and the stream scrolls up to meet it, Escape or a click outside dismisses.
- **Auth** is [Clerk](https://clerk.com/docs/react/getting-started/quickstart). `App` gates on
  `<Show when="signed-in">`; signed-out visitors get `SignInScreen`, which renders the prebuilt
  `<SignIn withSignUp />` card directly with Clerk's default appearance. **Log out** calls
  Clerk's `signOut()`.
- **`withSignUp` is load-bearing.** Without it the card's "Sign up" link follows `signUpUrl`,
  which defaults to the instance's hosted Account Portal on `accounts.dev` — a different
  origin, so the user leaves the SPA for a page with its own dashboard-configured theme and no
  route back. The combined flow keeps sign-up inside this instance. No `path` prop either, so
  routing stays hash-based and in-app; there is no router here.
- **Clerk's card is fenced off from the app's CSS.** Clerk renders into this document, so the
  bare `a` / `input::placeholder` / `::selection` rules in `index.css` would otherwise repaint
  it in the product's design; each is scoped with `:not(.cl-rootBox *)`. Clerk's `fontFamily`
  variable defaults to `inherit`, so `.cl-rootBox` also resets typography to a neutral system
  stack — without that, the card renders in Inter Tight. Nothing is passed to `appearance`.
- **Per-user data** is enforced on the server: every function in `convex/tasks.ts` resolves
  the caller through `ctx.auth.getUserIdentity()` and filters or ownership-checks on it, so
  scoping no longer depends on the client getting a storage key right. `Today` is still
  mounted with `key={user.id}`, which now resets in-flight UI state and the scroll anchor on
  an account switch. The stream follows the account to any browser.
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
