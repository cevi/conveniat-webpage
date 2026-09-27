import {
  hasAccessToThis,
  HOF_DASHBOARD_REVIEWER_ROLES,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import type { Payload, PayloadRequest } from 'payload';

/**
 * The Cevi.DB role that opens a Hof's dashboard: the address administrator of the Ortsgruppe
 * the Hof belongs to. The role is read per group, so it opens that one Hof and no other.
 */
export const HOF_ADMINISTRATOR_ROLE_CLASS = 'Group::Ortsgruppe::AdministratorCeviDB';

/** One role of a user, as the login copies it from the Cevi.DB profile onto the Payload user. */
interface CeviDatabaseRole {
  id?: number | null;
  role_class?: string | null;
}

/**
 * The Cevi.DB groups a user administers, as text, the way a Hof stores its `groupId`.
 *
 * Only the address administrator role counts: a leader or member of the same group is a
 * participant of the Hof, not the person who hands in its plans.
 */
export const getAdministeredGroupIds = (
  roles: readonly CeviDatabaseRole[] | null | undefined,
): string[] => {
  const groupIds = new Set<string>();
  for (const role of roles ?? []) {
    if (role.role_class !== HOF_ADMINISTRATOR_ROLE_CLASS) continue;
    if (typeof role.id !== 'number' || !Number.isInteger(role.id) || role.id <= 0) continue;
    groupIds.add(String(role.id));
  }
  return [...groupIds];
};

/** A Hof by name, as the dashboard and the forms list it. */
export interface HofName {
  id: string;
  name: string;
}

/** Most Höfe the camp has; far more than it will ever have. */
const MAX_HOEFE = 1000;

/** The Höfe of the given Cevi.DB groups, or every Hof without groups, sorted by name. */
export const findHoefe = async (
  payload: Pick<Payload, 'find'>,
  groupIds?: readonly string[],
): Promise<HofName[]> => {
  const { docs } = await payload.find({
    collection: 'hoefe',
    ...(groupIds === undefined ? {} : { where: { groupId: { in: groupIds } } }),
    depth: 0,
    limit: MAX_HOEFE,
    overrideAccess: true,
    pagination: false,
    select: { name: true },
  });
  return docs
    .map((hof) => ({ id: hof.id, name: hof.name }))
    .toSorted((a, b) => a.name.localeCompare(b.name, 'de'));
};

/** Who reviews what the Höfe hand in and edits the dashboard's settings. */
export const canReviewHofDashboard = ({ req }: { req: PayloadRequest }): boolean =>
  hasAccessToThis({ req, requiredRoles: HOF_DASHBOARD_REVIEWER_ROLES });

/**
 * Whether the user of a request may open a Hof's dashboard and what was handed in for it: the
 * reviewers every Hof, the address administrator of a Hof's Cevi.DB group that Hof and no other.
 *
 * Checked when a file is served and when a Hof hands a form in, so neither trusts the Hof a
 * request names.
 */
export const mayOpenHof = async (request: PayloadRequest, hofId: string): Promise<boolean> => {
  if (canReviewHofDashboard({ req: request })) return true;
  const user = request.user;
  if (!user || !('groups' in user) || !Array.isArray(user.groups)) return false;

  const groupIds = getAdministeredGroupIds(user.groups);
  if (groupIds.length === 0) return false;
  const hoefe = await findHoefe(request.payload, groupIds);
  return hoefe.some((hof) => hof.id === hofId);
};
