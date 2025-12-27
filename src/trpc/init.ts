import prisma from '@/lib/database';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { auth } from '@/utils/auth';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { initTRPC, TRPCError } from '@trpc/server';
import { cache } from 'react';
import superjson from 'superjson';

export const createTRPCContext = cache(async () => {
  const session = await auth();
  const sessionUser = session?.user as HitobitoNextAuthUser | undefined;

  const locale = await getLocaleFromCookies();

  if (sessionUser === undefined) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'User not authenticated',
    });
  }

  return { user: sessionUser, locale, prisma: prisma };
});

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});
// Base router and procedure helpers
export const middleware = t.middleware;
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const trpcBaseProcedure = t.procedure;
