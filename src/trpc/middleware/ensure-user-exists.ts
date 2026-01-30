import { middleware } from '@/trpc/init';
import { TRPCError } from '@trpc/server';

/**
 * Middleware that ensures the current user exists in the Prisma database.
 * This handles the case where a user might be authenticated via Payload CMS
 * but hasn't been synced to Prisma yet.
 */
export const ensureUserExistsMiddleware = middleware(async ({ ctx, next }) => {
  const { user, prisma } = ctx;

  if (!user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'User must be authenticated',
    });
  }

  // Upsert user to ensure they exist in Prisma
  await prisma.user.upsert({
    where: { uuid: user.uuid },
    update: {
      name: user.name,
      lastSeen: new Date(),
    },
    create: {
      uuid: user.uuid,
      name: user.name,
      lastSeen: new Date(),
    },
  });

  return next({ ctx: { ...ctx, user } });
});
