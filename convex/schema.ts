import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  /**
   * `userId` is the Clerk subject, taken from the verified JWT on the server — never from a
   * client argument. No ordering column: `by_user` orders by `_creationTime` after `userId`,
   * so a descending scan is "newest first" for free.
   */
  tasks: defineTable({
    userId: v.string(),
    text: v.string(),
    done: v.boolean(),
  }).index('by_user', ['userId']),

  /**
   * One row per note rather than an array on the task, so dragging doesn't rewrite the task
   * document. `x`/`y` are fractions of the focus overlay (0–1) so a note holds its place on a
   * different window size; `w`/`h` are pixels, absent until the note is resized.
   */
  notes: defineTable({
    userId: v.string(),
    taskId: v.id('tasks'),
    text: v.string(),
    x: v.number(),
    y: v.number(),
    w: v.optional(v.number()),
    h: v.optional(v.number()),
  }).index('by_task', ['taskId']),

  /**
   * One row per user — the session's clock, which is why it is not per-task and not per-device.
   *
   * A deadline rather than a countdown. The old client decremented a counter once per
   * `setInterval` callback, which made elapsed time mean "how often the browser chose to run
   * me": a background tab is throttled to one callback a minute, and a sleeping machine runs
   * none at all, so the clock silently stopped whenever it was not being watched. `endsAt` is
   * a fact about when the phase is over, so no code has to run for time to pass.
   *
   * The two fields are exclusive, and which one is set is also what "running" means:
   * `endsAt` holds it while the clock runs, `leftMs` while it is paused. Storing both at once
   * would leave two answers to the same question and no rule for which is older.
   */
  pomodoro: defineTable({
    userId: v.string(),
    phase: v.union(v.literal('focus'), v.literal('break'), v.literal('longBreak')),
    /** Epoch ms **on the server's clock**, or null while paused. See `pomodoro.sync`. */
    endsAt: v.union(v.number(), v.null()),
    /** Milliseconds still to go, meaningful only while `endsAt` is null. */
    leftMs: v.number(),
    /** Focus phases finished since the last long break. */
    done: v.number(),
  }).index('by_user', ['userId']),
});
