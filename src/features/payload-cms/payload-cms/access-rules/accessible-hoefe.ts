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
import { ACTIVE_REGISTRATION } from '@/features/payload-cms/payload-cms/utils/hof-membership';
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

/** A Hof whose bands the user hands out, and whether as its AVP or as a helper the AVP named. */
export interface WristbandHof extends HofName {
  /** the AVP, or a full admin, also names and removes the helpers */
  role: 'avp' | 'helper';
}

const idOfHof = (hof: string | { id: string }): string => (typeof hof === 'string' ? hof : hof.id);

/** The Höfe of the given ids, with the camp events whose registrations belong to them. */
const findHoefeByIds = async (
  payload: Pick<Payload, 'find'>,
  hofIds: readonly string[],
): Promise<(HofName & { eventIds: string[] })[]> => {
  if (hofIds.length === 0) return [];
  const { docs } = await payload.find({
    collection: 'hoefe',
    where: { id: { in: hofIds } },
    depth: 0,
    limit: hofIds.length,
    pagination: false,
    overrideAccess: true,
    select: { name: true, events: true },
  });
  return docs.map((hof) => ({
    id: hof.id,
    name: hof.name,
    eventIds: (hof.events ?? []).map((event) => event.eventId),
  }));
};

/**
 * The Höfe whose AVP named the user a helper, by the Cevi.DB id of the Payload user, as long as
 * the user is still registered at the Hof: a helper whose registration ended, who no longer
 * shows up for the AVP to remove, hands out nothing.
 */
const findHelperHoefe = async (
  payload: Pick<Payload, 'find'>,
  ceviDatabaseId: number | null | undefined,
): Promise<HofName[]> => {
  if (typeof ceviDatabaseId !== 'number') return [];
  const personId = String(ceviDatabaseId);
  const { docs } = await payload.find({
    collection: 'wristband-helpers',
    where: { personId: { equals: personId } },
    depth: 0,
    limit: 1000,
    pagination: false,
    overrideAccess: true,
    select: { hof: true },
  });
  const hoefe = await findHoefeByIds(
    payload,
    docs.map((helper) => idOfHof(helper.hof)),
  );
  const eventIds = hoefe.flatMap((hof) => hof.eventIds);
  if (eventIds.length === 0) return [];
  const { docs: registrations } = await payload.find({
    collection: 'bill-participants',
    where: {
      and: [{ userId: { equals: personId } }, { eventId: { in: eventIds } }, ACTIVE_REGISTRATION],
    },
    depth: 0,
    limit: eventIds.length,
    pagination: false,
    overrideAccess: true,
    select: { eventId: true },
  });
  const registeredAt = new Set(registrations.map((registration) => registration.eventId));
  return hoefe
    .filter((hof) => hof.eventIds.some((eventId) => registeredAt.has(eventId)))
    .map(({ id, name }) => ({ id, name }));
};

/**
 * The Höfe whose NFC wristbands the user programs and hands out, sorted by name: every Hof for
 * a full admin (`WRISTBAND_ADMIN_ROLES`), else the Höfe of the Cevi.DB groups the user is
 * address administrator of, the same Höfe as on the Hof dashboard, the Höfe whose camp the user
 * leads (`avpHoefe`), and the Höfe whose AVP named the user a helper. Unlike the dashboard, a reviewer gets no other Hof: the bands name the
 * children who wear them.
 *
 * A helper is the one right here an AVP grants in the app instead of a Cevi.DB group: it lasts
 * only for the bands of that Hof and until the AVP takes it back.
 */
export const listWristbandHoefe = async (
  payload: Pick<Payload, 'find' | 'findByID'>,
  user: HitobitoNextAuthUser,
): Promise<WristbandHof[]> => {
  const admin = hasAccessToThisUser({ user, requiredRoles: WRISTBAND_ADMIN_ROLES });
  if (admin) {
    const hoefe = await findHoefe(payload);
    logger.debug('Resolved the Höfe whose wristbands a user hands out', {
      'wristband.admin': true,
      'wristband.hoefe': hoefe.length,
    });
    return hoefe.map((hof) => ({ ...hof, role: 'avp' }));
  }

  const payloadUser = await payload.findByID({
    collection: 'users',
    id: user.uuid,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    select: { groups: true, cevi_db_uuid: true, avpHoefe: true },
  });
  const groupIds = getAdministeredGroupIds(payloadUser?.groups);
  const [byGroup, byLeadership, helping] = await Promise.all([
    groupIds.length === 0 ? Promise.resolve([]) : findHoefe(payload, groupIds),
    // the Hauptleitung of the Hof's camp is its AVP too, see the glossary in AGENTS.md
    findHoefeByIds(
      payload,
      (payloadUser?.avpHoefe ?? []).map((hof) => idOfHof(hof)),
    ),
    findHelperHoefe(payload, payloadUser?.cevi_db_uuid),
  ]);
  const administered = [
    ...new Map(
      [...byGroup, ...byLeadership].map(({ id, name }) => [id, { id, name }] as const),
    ).values(),
  ];
  const avpIds = new Set(administered.map((hof) => hof.id));
  const hoefe: WristbandHof[] = [
    ...administered.map((hof): WristbandHof => ({ ...hof, role: 'avp' })),
    ...helping
      .filter((hof) => !avpIds.has(hof.id))
      .map((hof): WristbandHof => ({ ...hof, role: 'helper' })),
  ].toSorted((a, b) => a.name.localeCompare(b.name, 'de'));

  logger.debug('Resolved the Höfe whose wristbands a user hands out', {
    'wristband.admin': false,
    'wristband.hoefe': hoefe.length,
    'wristband.helper_hoefe': hoefe.length - administered.length,
  });
  return hoefe;
};
