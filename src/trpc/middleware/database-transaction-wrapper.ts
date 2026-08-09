import { middleware } from '@/trpc/init';

/**
 * Wraps the procedure in a database transaction.
 *
 * Writes only become visible to other connections once the transaction
 * commits, so side effects that make clients re-read the database (e.g.
 * realtime pub/sub announcements) must not run inside the handler — a client
 * could refetch before the commit and cache the stale state. Register such
 * effects via `ctx.afterTransactionCommit`; they run once the transaction has
 * committed and are discarded when the procedure fails.
 */
export const databaseTransactionWrapper = middleware(async ({ ctx, next }) => {
  const afterCommitCallbacks: Array<() => void> = [];

  const result = await ctx.prisma.$transaction(async (tx) => {
    return await next({
      ctx: {
        prisma: tx,
        afterTransactionCommit: (callback: () => void): void => {
          afterCommitCallbacks.push(callback);
        },
      },
    });
  });

  if (result.ok) {
    for (const callback of afterCommitCallbacks) {
      try {
        callback();
      } catch (error) {
        console.error('[databaseTransactionWrapper] after-commit callback failed:', error);
      }
    }
  }

  return result;
});
