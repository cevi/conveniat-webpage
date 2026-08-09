import { hasAccessToThisUser, Roles } from '@/features/payload-cms/payload-cms/access-rules/roles';
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

/**
 * `UNAUTHORIZED` (401), not `FORBIDDEN` (403): the request carries no valid
 * session, so the client has to re-authenticate. The tRPC client turns a 401
 * into a sign out plus a redirect to `/entrypoint`; a 403 is treated as "signed
 * in but not allowed" and is deliberately left alone, so returning it here
 * meant an expired session was never cleaned up.
 */
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
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

const isAdmin = t.middleware(({ ctx, next }) => {
  // not signed in at all -> 401, see `isAuthed`
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'User not authenticated.',
    });
  }

  const hasAccess = hasAccessToThisUser({
    user: ctx.user,
    requiredRoles: [Roles.FullAdmin, Roles.WebCoreTeam],
  });

  // signed in, but lacking the required role -> 403, and no sign out
  if (!hasAccess) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }

  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

export const trpcAdminProcedure = t.procedure.use(isAdmin);
