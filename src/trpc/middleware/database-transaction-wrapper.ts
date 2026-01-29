import { middleware } from '@/trpc/init';

export const databaseTransactionWrapper = middleware(async ({ ctx, next }) => {
  return ctx.prisma.$transaction(async (tx) => {
    return await next({
      ctx: { prisma: tx },
    });
  });
});
