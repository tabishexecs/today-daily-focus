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
   */
  tasks: defineTable({
    userId: v.string(),
    text: v.string(),
    done: v.boolean(),
  }).index('by_user', ['userId']),
});
