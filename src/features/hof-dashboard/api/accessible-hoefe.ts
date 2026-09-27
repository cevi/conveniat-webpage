import {
  findHoefe,
  getAdministeredGroupIds,
  type HofName,
} from '@/features/payload-cms/payload-cms/access-rules/can-access-hof-dashboard';
import {
  hasAccessToThisUser,
  HOF_DASHBOARD_REVIEWER_ROLES,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { createLogger } from '@/utils/server-logger';
import type { Payload } from 'payload';

const logger = createLogger('hof-dashboard:access');

/** The reviewers see every Hof's dashboard, checked here with the session's groups. */
export const isHofDashboardReviewer = (user: HitobitoNextAuthUser): boolean =>
  hasAccessToThisUser({ user, requiredRoles: HOF_DASHBOARD_REVIEWER_ROLES });

/**
 * The Höfe whose dashboard the user may open, sorted by name: every Hof for a reviewer, else
 * the Höfe of the Cevi.DB groups the user is address administrator of.
 *
 * The session carries only group ids, so the roles are read off the Payload user, where the
 * login copies them from the Cevi.DB profile.
 */
export const listAccessibleHoefe = async (
  payload: Pick<Payload, 'find' | 'findByID'>,
  user: HitobitoNextAuthUser,
): Promise<HofName[]> => {
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

  const hoefe = await findHoefe(payload, groupIds);

  logger.debug('Resolved the Höfe of a Hof dashboard user', {
    'hof_dashboard.reviewer': groupIds === undefined,
    'hof_dashboard.hoefe': hoefe.length,
  });
  return hoefe;
};
