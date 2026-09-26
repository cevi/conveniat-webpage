import { environmentVariables } from '@/config/environment-variables';
import {
  canAccessAdminPanel,
  canUserAccessAdminPanel,
} from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import { hasAdminOrWebAccess } from '@/features/payload-cms/payload-cms/access-rules/roles';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import type { Access, FieldAccess } from 'payload';

/**
 * Access control function that restricts access to the billing features.
 * Only users who have admin panel access AND are in the specific billing admin group
 * can read or edit billing details.
 */
export const canAccessBilling: Access = (args) => {
  const { req } = args;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (req.context?.['internal'] === true) return true;
  if (!canAccessAdminPanel({ req })) return false;
  const user = req.user;
  if (!user || typeof user !== 'object' || !('groups' in user) || !Array.isArray(user.groups))
    return false;
  const billingGroupId = environmentVariables.BILLING_ADMIN_GROUP_ID;
  if (!billingGroupId) return false;
  return user.groups.some(
    (group: unknown) =>
      group && typeof group === 'object' && 'id' in group && String(group.id) === billingGroupId,
  );
};

/**
 * The billing team, the full admins and the web core team.
 *
 * For shared reference data the billing sync owns but other areas look up, like the Höfe:
 * billing maintains it, admin and web have to see it to build on it. It lives here rather
 * than in `roles.ts` because `roles.ts` is imported by this file, and billing is an add-on
 * group rather than a role.
 */
export const hasBillingOrAdminOrWebAccess: Access = (args) => {
  if (hasAdminOrWebAccess({ req: args.req })) return true;
  return canAccessBilling(args);
};

export const canAccessBillingField: FieldAccess = ({ req }) => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (req.context?.['internal'] === true) return true;
  if (!canAccessAdminPanel({ req })) return false;
  const user = req.user;
  if (!user || typeof user !== 'object' || !('groups' in user) || !Array.isArray(user.groups))
    return false;
  const billingGroupId = environmentVariables.BILLING_ADMIN_GROUP_ID;
  if (!billingGroupId) return false;
  return user.groups.some(
    (group: unknown) =>
      group && typeof group === 'object' && 'id' in group && String(group.id) === billingGroupId,
  );
};

/**
 * Utility to verify if a user object has billing access.
 * Useful for hiding UI elements.
 */
export const canUserAccessBilling = (user: unknown): boolean => {
  if (!user || typeof user !== 'object') return false;

  const billingGroupId = environmentVariables.BILLING_ADMIN_GROUP_ID;
  if (!billingGroupId) return false;

  if ('groups' in user && Array.isArray(user.groups)) {
    const groups = new Set(environmentVariables.GROUPS_WITH_API_ACCESS);
    if (
      !user.groups.some(
        (g: unknown) => g && typeof g === 'object' && 'id' in g && groups.has(Number(g.id)),
      )
    )
      return false;
    return user.groups.some(
      (g: unknown) => g && typeof g === 'object' && 'id' in g && String(g.id) === billingGroupId,
    );
  }

  if ('group_ids' in user && Array.isArray(user.group_ids)) {
    if (!canUserAccessAdminPanel({ user: user as HitobitoNextAuthUser })) return false;
    return user.group_ids.some((id: unknown) => String(id) === billingGroupId);
  }

  return false;
};
