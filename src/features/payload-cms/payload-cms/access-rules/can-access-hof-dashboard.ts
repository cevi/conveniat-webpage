import {
  hasAccessToThis,
  HOF_DASHBOARD_REVIEWER_ROLES,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import type { Access, PayloadRequest } from 'payload';

/**
 * The Cevi.DB role that opens a Hof's dashboard: the address administrator of the Ortsgruppe
 * the Hof belongs to. The role is read per group, so it opens that one Hof and no other.
 */
export const HOF_ADMINISTRATOR_ROLE_CLASS = 'Group::Ortsgruppe::AdministratorCeviDB';

/** One role of a user, as the login copies it from the Cevi.DB profile onto the Payload user. */
export interface CeviDatabaseRole {
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

/** Who reviews what the Höfe hand in and edits the dashboard's settings. */
export const canReviewHofDashboard = ({ req }: { req: PayloadRequest }): boolean =>
  hasAccessToThis({ req, requiredRoles: HOF_DASHBOARD_REVIEWER_ROLES });

/**
 * The files a Hof handed in: the reviewers see all of them, the address administrator of a
 * Hof's Cevi.DB group sees that Hof's and no other.
 *
 * Checked when a file is served, so a download link only opens for the people the dashboard
 * showed it to.
 */
export const canReadHofFiles: Access = async ({ req }) => {
  if (canReviewHofDashboard({ req })) return true;
  const user = req.user;
  if (!user || !('groups' in user) || !Array.isArray(user.groups)) return false;

  const groupIds = getAdministeredGroupIds(user.groups);
  if (groupIds.length === 0) return false;

  const { docs } = await req.payload.find({
    collection: 'hoefe',
    where: { groupId: { in: groupIds } },
    depth: 0,
    limit: groupIds.length,
    pagination: false,
    overrideAccess: true,
    select: {},
    req,
  });
  if (docs.length === 0) return false;
  return { hof: { in: docs.map((hof) => hof.id) } };
};
