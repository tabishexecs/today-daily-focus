import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

/**
 * The Clerk subject for this request. Throws rather than returning null: every function
 * here is per-user, so an unauthenticated call is a bug, not an empty result.
 */
async function userId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not signed in');
  return identity.subject;
}

/** Strips `userId` and `_creationTime` — the client needs neither, so don't ship them. */
const view = (t: Doc<'tasks'>) => ({ id: t._id, text: t.text, done: t.done });

/**
 * Loads a task and asserts it belongs to the caller. A row that exists but belongs to
 * someone else gets the same error as one that doesn't, so the id space stays opaque.
 */
async function own(ctx: MutationCtx, id: Id<'tasks'>): Promise<Doc<'tasks'>> {
  const task = await ctx.db.get(id);
  if (!task || task.userId !== (await userId(ctx))) throw new Error('No such task');
  return task;
}

/** The caller's whole stream, newest first. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const uid = await userId(ctx);
    const tasks = await ctx.db
      .query('tasks')
      .withIndex('by_user', (q) => q.eq('userId', uid))
      .order('desc')
      .collect();
    return tasks.map(view);
  },
});

export const add = mutation({
  args: { text: v.string() },
  handler: async (ctx, { text }) => {
    const trimmed = text.trim();
    if (!trimmed) throw new Error('Task text is empty');
    await ctx.db.insert('tasks', { userId: await userId(ctx), text: trimmed, done: false });
  },
});

/** One-way: nothing in the UI un-completes a task. */
export const complete = mutation({
  args: { id: v.id('tasks') },
  handler: async (ctx, { id }) => {
    const task = await own(ctx, id);
    if (!task.done) await ctx.db.patch(id, { done: true });
  },
});

export const remove = mutation({
  args: { id: v.id('tasks') },
  handler: async (ctx, { id }) => {
    await own(ctx, id);
    await ctx.db.delete(id);
  },
});
