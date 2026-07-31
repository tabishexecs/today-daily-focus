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
| `convex/schema.ts` | The `tasks` table + its `by_user` index |
| `convex/tasks.ts` | `list` query, `add` / `complete` / `remove` mutations — all scoped to the caller |
| `convex/auth.config.ts` | Which Clerk instance's JWTs the backend trusts |
| `src/main.tsx` | Mounts the app inside `<ClerkProvider>` → `<ConvexProviderWithClerk>` |
| `src/types.ts` | Domain types + timer constants (`FOCUS_TOTAL`, `BREAK_TOTAL`) |
| `src/reducer.ts` | Pure UI state transitions (all `UiState` changes) |
| `src/useToday.ts` | Hook: joins the Convex query with local strike state, owns the mutations and their optimistic updates, the Pomodoro timer, capture, and outside-click dismissal |
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

- **Design tokens** (colors, 11px DM Mono, tracking, spacing, radii, easings) come from the
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
  and self-heals on the next write. This is the only thing left in `localStorage`, and
  deliberately so: it is where *this* screen is looking, so syncing it would let one device
  scroll another.
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
  stack — without that, the card renders in DM Mono. Nothing is passed to `appearance`.
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
