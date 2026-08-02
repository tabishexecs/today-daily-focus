import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

export type Ctx = QueryCtx | MutationCtx;

/** Throws rather than returning null: every function here is per-user. */
export async function userId(ctx: Ctx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not signed in');
  return identity.subject;
}

/**
 * Loads a task and asserts it belongs to the caller. Someone else's row gets the same error as
 * a missing one, so the id space stays opaque.
 */
export async function ownTask(ctx: Ctx, id: Id<'tasks'>): Promise<Doc<'tasks'>> {
  const task = await ctx.db.get(id);
  if (!task || task.userId !== (await userId(ctx))) throw new Error('No such task');
  return task;
}
