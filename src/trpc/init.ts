import prisma from '@/lib/db/prisma';
import {
  type HitobitoNextAuthUser,
  HitobitoNextAuthUserSchema,
} from '@/types/hitobito-next-auth-user';
import { auth } from '@/utils/auth';
import { isValidNextAuthUser } from '@/utils/auth-helpers';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { initTRPC, TRPCError } from '@trpc/server';
import { cache } from 'react';
import superjson from 'superjson';

export const createTRPCContext = cache(async () => {
  const session = await auth();
  let sessionUser: HitobitoNextAuthUser | undefined;

  if (session?.user) {
    if (isValidNextAuthUser(session.user)) {
      sessionUser = session.user;
    } else {
      const result = HitobitoNextAuthUserSchema.safeParse(session.user);
      if (!result.success) {
        console.warn(
          '[createTRPCContext] Session invalid (Schema Mismatch):',
          JSON.stringify(result.error.format()),
        );
      }
    }
  }

  const locale = await getLocaleFromCookies();
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
export const publicProcedure = t.procedure;

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `User not authenticated. User: ${ctx.user}`,
    });
  }

  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

export const trpcBaseProcedure = t.procedure.use(isAuthed);
