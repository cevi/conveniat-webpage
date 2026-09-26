import { environmentVariables } from '@/config/environment-variables';
import { getAdministeredGroupIds } from '@/features/hof-dashboard/utils/hof-administrator';
import { hasAccessToThisUser, Roles } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { middleware, trpcBaseProcedure } from '@/trpc/init';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { createLogger } from '@/utils/server-logger';
import config from '@payload-config';
import { TRPCError } from '@trpc/server';
import { getPayload } from 'payload';

const logger = createLogger('hof-dashboard:access');

/**
 * The reviewers see every Hof's dashboard. The same roles as `canReviewHofDashboard` on the
 * Payload side, checked here with the session's groups.
 */
export const isHofDashboardReviewer = (user: HitobitoNextAuthUser): boolean =>
  hasAccessToThisUser({ user, requiredRoles: [Roles.FullAdmin, Roles.WebCoreTeam] });

/** A Hof the user may open, as the Hof selector lists it. */
export interface AccessibleHof {
  id: string;
  name: string;
}

/**
 * The Höfe whose dashboard the user may open, sorted by name: every Hof for a reviewer, else
 * the Höfe of the Cevi.DB groups the user is address administrator of.
 *
 * The session carries only group ids, so the roles are read off the Payload user, where the
 * login copies them from the Cevi.DB profile.
 */
const listAccessibleHoefe = async (user: HitobitoNextAuthUser): Promise<AccessibleHof[]> => {
  const payload = await getPayload({ config });

  let groupIds: string[] | undefined;
  if (!isHofDashboardReviewer(user)) {
    const payloadUser = await payload.findByID({
      collection: 'users',
      id: user.uuid,
      depth: 0,
      overrideAccess: true,
      disableErrors: true,
      select: { groups: true },
    });
    groupIds = getAdministeredGroupIds(payloadUser?.groups);
    if (groupIds.length === 0) return [];
  }

  const { docs } = await payload.find({
    collection: 'hoefe',
    ...(groupIds === undefined ? {} : { where: { groupId: { in: groupIds } } }),
    depth: 0,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
    select: { name: true },
  });
  const hoefe = docs
    .map((hof) => ({ id: hof.id, name: hof.name }))
    .toSorted((a, b) => a.name.localeCompare(b.name, 'de'));

  logger.debug('Resolved the Höfe of a Hof dashboard user', {
    'hof_dashboard.reviewer': groupIds === undefined,
    'hof_dashboard.hoefe': hoefe.length,
  });
  return hoefe;
};

const hofDashboardEnabled = middleware(({ next }) => {
  if (!environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD) {
    throw new TRPCError({ code: 'NOT_FOUND' });
  }
  return next();
});

/**
 * Every signed-in user. `ctx.accessibleHoefe()` lists the Höfe they may open, read on first use
 * and then kept; `ctx.assertHofAccess(hofId)` throws unless the Hof is one of them.
 */
export const hofDashboardProcedure = trpcBaseProcedure
  .use(hofDashboardEnabled)
  .use(({ ctx, next }) => {
    let accessible: Promise<AccessibleHof[]> | undefined;
    const accessibleHoefe = (): Promise<AccessibleHof[]> =>
      (accessible ??= listAccessibleHoefe(ctx.user));
    const assertHofAccess = async (hofId: string): Promise<AccessibleHof> => {
      const hoefe = await accessibleHoefe();
      const hof = hoefe.find((candidate) => candidate.id === hofId);
      if (hof === undefined) throw new TRPCError({ code: 'FORBIDDEN' });
      return hof;
    };
    return next({
      ctx: {
        accessibleHoefe,
        assertHofAccess,
        isReviewer: isHofDashboardReviewer(ctx.user),
      },
    });
  });
