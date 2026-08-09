import { hasAccessToThisUser, Roles } from '@/features/payload-cms/payload-cms/access-rules/roles';
import prisma from '@/lib/db/prisma';
import { USER_BLOCKED_ERROR_MESSAGE } from '@/lib/user-blocking/constants';
import { isUserBlocked } from '@/lib/user-blocking/is-user-blocked';
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

const isAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `User not authenticated. User: ${ctx.user}`,
    });
  }

  // Blocked users lose access to every authenticated feature immediately — the
  // status is re-checked here instead of being trusted from the (long-lived) JWT.
  if (await isUserBlocked(ctx.user.uuid)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: USER_BLOCKED_ERROR_MESSAGE,
    });
  }

  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

export const trpcBaseProcedure = t.procedure.use(isAuthed);

const isAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'User not authenticated.',
    });
  }

  if (await isUserBlocked(ctx.user.uuid)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: USER_BLOCKED_ERROR_MESSAGE,
    });
  }

  const hasAccess = hasAccessToThisUser({
    user: ctx.user,
    requiredRoles: [Roles.FullAdmin, Roles.WebCoreTeam],
  });

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
