import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { ownTask, userId } from './helpers';
import type { Ctx } from './helpers';

/** Mirrored by `NOTE_MAX` in `src/types.ts`, which caps typing at the same length. */
const NOTE_MAX = 2000;

/** Keeps `forTask` bounded. */
const NOTE_LIMIT = 50;

/** The size a note is created at, and the smallest it can be dragged to. */
const NOTE_MIN_W = 188;
const NOTE_MIN_H = 104;

const NOTE_MAX_SIDE = 4000;

/** Positions are fractions of the overlay; one outside it would put a note out of reach. */
const frac = (n: number) => Math.min(1, Math.max(0, n));

/** Strips what the client already has, and fills in the size of an unresized note. */
const view = (n: Doc<'notes'>) => ({
  id: n._id,
  text: n.text,
  x: n.x,
  y: n.y,
  w: n.w ?? NOTE_MIN_W,
  h: n.h ?? NOTE_MIN_H,
});

/** Every note on one task, oldest first, which is also their stacking order. */
async function notesOf(ctx: Ctx, taskId: Id<'tasks'>): Promise<Doc<'notes'>[]> {
  return await ctx.db
    .query('notes')
    .withIndex('by_task', (q) => q.eq('taskId', taskId))
    .take(NOTE_LIMIT);
}

/** Loads a note and asserts it belongs to the caller, on the same terms as `ownTask`. */
async function ownNote(ctx: MutationCtx, id: Id<'notes'>): Promise<Doc<'notes'>> {
  const note = await ctx.db.get(id);
  if (!note || note.userId !== (await userId(ctx))) throw new Error('No such note');
  return note;
}

/** Reading a task's notes is reading the task, so it takes the task's ownership check. */
export const forTask = query({
  args: { taskId: v.id('tasks') },
  handler: async (ctx, { taskId }) => {
    await ownTask(ctx, taskId);
    return (await notesOf(ctx, taskId)).map(view);
  },
});

/**
 * Adds an empty note. Each one steps down and to the right of the last so it lands beside its
 * neighbours rather than on them, in a column clear of the timer and the player.
 */
export const add = mutation({
  args: { taskId: v.id('tasks') },
  handler: async (ctx, { taskId }) => {
    await ownTask(ctx, taskId);
    const existing = await notesOf(ctx, taskId);
    if (existing.length >= NOTE_LIMIT) throw new Error('Too many notes on this task');
    const step = existing.length % 5;
    await ctx.db.insert('notes', {
      userId: await userId(ctx),
      taskId,
      text: '',
      x: 0.06 + step * 0.035,
      y: 0.2 + step * 0.08,
    });
  },
});

/** Focus mode debounces, so this lands a few times per edit. */
export const setText = mutation({
  args: { id: v.id('notes'), text: v.string() },
  handler: async (ctx, { id, text }) => {
    await ownNote(ctx, id);
    if (text.length > NOTE_MAX) throw new Error('Note is too long');
    await ctx.db.patch(id, { text });
  },
});

/** Written once per drag, when the note is dropped — not while it is moving. */
export const move = mutation({
  args: { id: v.id('notes'), x: v.number(), y: v.number() },
  handler: async (ctx, { id, x, y }) => {
    await ownNote(ctx, id);
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Bad position');
    await ctx.db.patch(id, { x: frac(x), y: frac(y) });
  },
});

/** Carries a position as well as a size: a left or top edge moves the note's own corner. */
export const resize = mutation({
  args: { id: v.id('notes'), x: v.number(), y: v.number(), w: v.number(), h: v.number() },
  handler: async (ctx, { id, x, y, w, h }) => {
    await ownNote(ctx, id);
    if (![x, y, w, h].every(Number.isFinite)) throw new Error('Bad geometry');
    const side = (n: number, min: number) => Math.min(NOTE_MAX_SIDE, Math.max(min, n));
    await ctx.db.patch(id, {
      x: frac(x),
      y: frac(y),
      w: side(w, NOTE_MIN_W),
      h: side(h, NOTE_MIN_H),
    });
  },
});

export const remove = mutation({
  args: { id: v.id('notes') },
  handler: async (ctx, { id }) => {
    await ownNote(ctx, id);
    await ctx.db.delete(id);
  },
});
