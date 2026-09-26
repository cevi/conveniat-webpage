import { environmentVariables } from '@/config/environment-variables';
import { getMyHofIds } from '@/features/material/api/material-hoefe';
import {
  hasAccessToThisUser,
  MATERIAL_DEPOT_ROLES,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { middleware, trpcBaseProcedure } from '@/trpc/init';
import { ensureUserExistsMiddleware } from '@/trpc/middleware/ensure-user-exists';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { TRPCError } from '@trpc/server';

/** Who runs the material depot: see `MATERIAL_DEPOT_ROLES` in roles.ts. */
export const isMaterialTeam = (user: HitobitoNextAuthUser): boolean =>
  hasAccessToThisUser({ user, requiredRoles: MATERIAL_DEPOT_ROLES });

const materialEnabled = middleware(({ next }) => {
  if (!environmentVariables.FEATURE_ENABLE_MATERIAL_MANAGEMENT) {
    throw new TRPCError({ code: 'NOT_FOUND' });
  }
  return next();
});

/**
 * Every signed-in participant; loans link to them, so their `User` row has to exist.
 * `ctx.myHofIds()` answers which Höfe they belong to, read on first use and then kept, since
 * most calls never ask.
 */
export const materialProcedure = trpcBaseProcedure
  .use(materialEnabled)
  .use(ensureUserExistsMiddleware)
  .use(({ ctx, next }) => {
    let mine: Promise<string[]> | undefined;
    return next({ ctx: { myHofIds: (): Promise<string[]> => (mine ??= getMyHofIds(ctx.user)) } });
  });

export const materialTeamProcedure = materialProcedure.use(
  middleware(({ ctx, next }) => {
    if (!ctx.user || !isMaterialTeam(ctx.user)) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    return next();
  }),
);
