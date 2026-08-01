import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

/** Either flavour of context that can read the database and the caller's identity. */
export type Ctx = QueryCtx | MutationCtx;

/**
 * The Clerk subject for this request. Throws rather than returning null: every function in
 * this app is per-user, so an unauthenticated call is a bug, not an empty result.
 */
export async function userId(ctx: Ctx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not signed in');
  return identity.subject;
}

/**
 * Loads a task and asserts it belongs to the caller. A row that exists but belongs to
 * someone else gets the same error as one that doesn't, so the id space stays opaque.
 */
export async function ownTask(ctx: Ctx, id: Id<'tasks'>): Promise<Doc<'tasks'>> {
  const task = await ctx.db.get(id);
  if (!task || task.userId !== (await userId(ctx))) throw new Error('No such task');
  return task;
}
