import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  /**
   * One row per task. `userId` is the Clerk subject (`identity.subject`), taken from the
   * verified JWT on the server — never from a client argument, so one account cannot read
   * or write another's rows.
   *
   * There is no explicit ordering column: the `by_user` index orders by `_creationTime`
   * after `userId`, so a descending scan of the index is "newest first" for free. Nothing
   * here corresponds to `striking`, which is a per-device animation, not stored state.
   *
   */
  tasks: defineTable({
    userId: v.string(),
    text: v.string(),
    done: v.boolean(),
  }).index('by_user', ['userId']),

  /**
   * Notes pinned over a task in focus mode. One row per note rather than an array on the
   * task: dragging writes a position several times per session, and a row keeps that write
   * off the task document.
   *
   * `x` and `y` are fractions of the focus overlay (0–1), not pixels, so a note holds its
   * place proportionally when the same account opens on a different window size. `w` and `h`
   * are pixels — how much room a note needs is about its text, not about the window — and
   * are absent until the note is resized away from the size it is created at.
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
});
