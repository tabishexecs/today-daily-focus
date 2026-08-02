import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import { ownTask, userId } from './helpers';

/** Strips `userId` and `_creationTime` — the client needs neither. */
const view = (t: Doc<'tasks'>) => ({ id: t._id, text: t.text, done: t.done });

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
    const task = await ownTask(ctx, id);
    if (!task.done) await ctx.db.patch(id, { done: true });
  },
});

export const remove = mutation({
  args: { id: v.id('tasks') },
  handler: async (ctx, { id }) => {
    await ownTask(ctx, id);
    // The notes go with it. Nothing else points at a task, so this is the whole cascade.
    const notes = await ctx.db
      .query('notes')
      .withIndex('by_task', (q) => q.eq('taskId', id))
      .collect();
    for (const note of notes) await ctx.db.delete(note._id);
    await ctx.db.delete(id);
  },
});
