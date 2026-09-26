import { getAdministeredGroupIds } from '@/features/hof-dashboard/utils/hof-administrator';
import { hasAdminOrWebAccess } from '@/features/payload-cms/payload-cms/access-rules/roles';
import type { Access, PayloadRequest } from 'payload';

/**
 * Who reviews what the Höfe hand in on the dashboard, and edits its settings.
 *
 * For now the full admins and the web core team. The infrastructure and programme Ressorts
 * will want this without the rest of the web team's rights; they get a role of their own once
 * their Cevi.DB groups are known.
 */
export const canReviewHofDashboard = ({ req }: { req: PayloadRequest }): boolean =>
  hasAdminOrWebAccess({ req });

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
