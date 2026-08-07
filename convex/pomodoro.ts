import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { userId } from './helpers';

type Phase = Doc<'pomodoro'>['phase'];

/**
 * Focus phases per long break. Cirillo's four: three short breaks are enough to carry you
 * through a set, and the rest that follows has to be long enough to leave the desk for.
 *
 * Server-side because the hand-over is: only the server knows whether a deadline has actually
 * passed, so it is the only place that may decide what comes next.
 */
const LONG_BREAK_EVERY = 4;

/**
 * How long each phase runs, in milliseconds, as the client reports it.
 *
 * The lengths come from the caller rather than living here, and that is the one thing the
 * server takes on trust. It buys `?fast`: the dev flag divides every phase by 60 to put a
 * whole set inside three minutes, and it can only keep working if the numbers the clock is
 * built from are the ones that flag has already touched. The guarantee it was written for
 * survives — `fastFactor` sits behind `import.meta.env.DEV`, so a built app has no code that
 * reads the flag and no link can shorten a real pomodoro.
 *
 * Nothing here is a security boundary: the durations are the caller's own clock, and the only
 * account they can reach is the one whose JWT carried them.
 */
const durations = v.object({
  focus: v.number(),
  break: v.number(),
  longBreak: v.number(),
});

type Durations = { focus: number; break: number; longBreak: number };

/** A second at the least, four hours at the most — enough to reject a NaN or a typo. */
const MIN_MS = 1000;
const MAX_MS = 4 * 60 * 60 * 1000;

function lengthOf(d: Durations, phase: Phase): number {
  const ms = d[phase];
  if (!Number.isFinite(ms)) throw new Error(`Bad duration for ${phase}`);
  return Math.min(Math.max(Math.round(ms), MIN_MS), MAX_MS);
}

/** Strips `userId` and the system fields — the client needs none of them. */
const view = (p: Doc<'pomodoro'>) => ({
  phase: p.phase,
  endsAt: p.endsAt,
  leftMs: p.leftMs,
  done: p.done,
});

/**
 * The caller's clock, creating it paused at a full focus phase the first time it is asked for.
 * Every mutation goes through here, so no other function has to think about the row not
 * existing yet.
 */
async function own(ctx: MutationCtx, d: Durations): Promise<Doc<'pomodoro'>> {
  const uid = await userId(ctx);
  const row = await ctx.db
    .query('pomodoro')
    .withIndex('by_user', (q) => q.eq('userId', uid))
    .unique();
  if (row) return row;

  // Paused, like the panel has always started: a clock that began counting because a page was
  // opened would be timing something nobody asked for.
  const doc = {
    userId: uid,
    phase: 'focus' as const,
    endsAt: null,
    leftMs: lengthOf(d, 'focus'),
    done: 0,
  };
  const id = await ctx.db.insert('pomodoro', doc);
  return { ...doc, _id: id, _creationTime: Date.now() };
}

/**
 * The stored clock, or null before the user has ever touched it.
 *
 * Deliberately does not read the wall clock or return a remaining time. A query is only rerun
 * when its data changes, and time passing is not a change to any row — a "seconds left"
 * computed here would be frozen at whatever it was when the row was last written. The client
 * holds `endsAt` against its own clock instead, which is the whole point of storing a deadline.
 */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const uid = await userId(ctx);
    const row = await ctx.db
      .query('pomodoro')
      .withIndex('by_user', (q) => q.eq('userId', uid))
      .unique();
    return row ? view(row) : null;
  },
});

/**
 * The server's clock, so the client can measure how far its own is off.
 *
 * `endsAt` is written in server time but read against the browser's, and those are the same
 * clock only by convention. A device whose clock is minutes out would otherwise show a pomodoro
 * minutes wrong — and be wrong quietly, which is the failure this whole change exists to end.
 * A mutation rather than a query because a query's answer is cached and reused, and the one
 * thing this must never return is a time from earlier.
 *
 * Writes nothing.
 */
export const sync = mutation({
  args: {},
  handler: async () => ({ now: Date.now() }),
});

/**
 * Start a paused clock, or pause a running one.
 *
 * Pausing converts the deadline back into a remainder and starting converts it forward again,
 * so a pause loses nothing but the time it was paused for.
 */
export const toggle = mutation({
  args: { durations },
  handler: async (ctx, { durations: d }) => {
    const row = await own(ctx, d);
    const now = Date.now();
    if (row.endsAt === null) {
      await ctx.db.patch(row._id, { endsAt: now + row.leftMs });
    } else {
      await ctx.db.patch(row._id, { endsAt: null, leftMs: Math.max(0, row.endsAt - now) });
    }
    return { now };
  },
});

/** Back to a full phase, paused. The phase itself and the set's count are left alone. */
export const reset = mutation({
  args: { durations },
  handler: async (ctx, { durations: d }) => {
    const row = await own(ctx, d);
    await ctx.db.patch(row._id, { endsAt: null, leftMs: lengthOf(d, row.phase) });
    return { now: Date.now() };
  },
});

/**
 * Hand the clock to the next phase, if and only if the current one has actually run out.
 *
 * The client asks for this when it notices the deadline has passed, which makes the request a
 * suggestion, not an instruction — the `endsAt` check below is what makes it true. That guard
 * is doing real work: a laptop woken after two hours and a second tab in the same account both
 * fire this, and every call after the first finds a fresh phase with a deadline in the future
 * and changes nothing.
 *
 * Exactly one phase per call, never a catch-up run through several. Coming back from lunch
 * should find one break waiting, not a set of them counted through in your absence — the time
 * away was not four pomodoros, and recording it as such would be a lie the numbers keep.
 */
export const advance = mutation({
  args: { durations },
  handler: async (ctx, { durations: d }) => {
    const row = await own(ctx, d);
    const now = Date.now();
    if (row.endsAt === null || now < row.endsAt) return { now, advanced: false };

    // A finished focus is one of the set; the fourth earns the long break and closes the set
    // out. Either break hands back to focus with the count as the focus left it.
    const done = row.phase === 'focus' ? row.done + 1 : row.done;
    const long = row.phase === 'focus' && done >= LONG_BREAK_EVERY;
    const phase: Phase = row.phase === 'focus' ? (long ? 'longBreak' : 'break') : 'focus';

    await ctx.db.patch(row._id, {
      phase,
      // Every hand-over stops here. A break that starts itself is counting rest nobody has
      // taken yet, and a focus that starts itself is counting work nobody has come back to —
      // the chime says the phase ended, and play says the next one begins.
      endsAt: null,
      leftMs: lengthOf(d, phase),
      done: long ? 0 : done,
    });
    return { now, advanced: true };
  },
});
