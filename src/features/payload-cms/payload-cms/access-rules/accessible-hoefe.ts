import {
  findHoefe,
  getAdministeredGroupIds,
  type HofName,
} from '@/features/payload-cms/payload-cms/access-rules/can-access-hof-dashboard';
import {
  hasAccessToThisUser,
  HOF_DASHBOARD_REVIEWER_ROLES,
  WRISTBAND_ADMIN_ROLES,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { createLogger } from '@/utils/server-logger';
import type { Payload } from 'payload';

const logger = createLogger('hof-dashboard:access');

/** The reviewers see every Hof's dashboard, checked here with the session's groups. */
export const isHofDashboardReviewer = (user: HitobitoNextAuthUser): boolean =>
  hasAccessToThisUser({ user, requiredRoles: HOF_DASHBOARD_REVIEWER_ROLES });

/**
 * The Höfe of the Cevi.DB groups the user is address administrator of, sorted by name.
 *
 * The session carries only group ids, so the roles are read off the Payload user, where the
 * login copies them from the Cevi.DB profile.
 */
const findAdministeredHoefe = async (
  payload: Pick<Payload, 'find' | 'findByID'>,
  user: HitobitoNextAuthUser,
): Promise<HofName[]> => {
  const payloadUser = await payload.findByID({
    collection: 'users',
    id: user.uuid,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    select: { groups: true },
  });
  const groupIds = getAdministeredGroupIds(payloadUser?.groups);
  if (groupIds.length === 0) return [];
  return await findHoefe(payload, groupIds);
};

/**
 * The Höfe whose dashboard the user may open, sorted by name: every Hof for a reviewer, else
 * the Höfe of the Cevi.DB groups the user is address administrator of.
 */
export const listAccessibleHoefe = async (
  payload: Pick<Payload, 'find' | 'findByID'>,
  user: HitobitoNextAuthUser,
): Promise<HofName[]> => {
  const reviewer = isHofDashboardReviewer(user);
  const hoefe = reviewer ? await findHoefe(payload) : await findAdministeredHoefe(payload, user);

  logger.debug('Resolved the Höfe of a Hof dashboard user', {
    'hof_dashboard.reviewer': reviewer,
    'hof_dashboard.hoefe': hoefe.length,
  });
  return hoefe;
};

/**
 * The Höfe whose NFC wristbands the user programs and hands out, sorted by name: every Hof for
 * a full admin (`WRISTBAND_ADMIN_ROLES`), else the Höfe of the Cevi.DB groups the user is
 * address administrator of, the same Höfe as on the Hof dashboard. Unlike the dashboard, a
 * reviewer gets no other Hof: the bands name the children who wear them.
 */
export const listWristbandHoefe = async (
  payload: Pick<Payload, 'find' | 'findByID'>,
  user: HitobitoNextAuthUser,
): Promise<HofName[]> => {
  const admin = hasAccessToThisUser({ user, requiredRoles: WRISTBAND_ADMIN_ROLES });
  const hoefe = admin ? await findHoefe(payload) : await findAdministeredHoefe(payload, user);

  logger.debug('Resolved the Höfe whose wristbands a user hands out', {
    'wristband.admin': admin,
    'wristband.hoefe': hoefe.length,
  });
  return hoefe;
};
