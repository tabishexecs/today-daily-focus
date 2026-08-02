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
});
