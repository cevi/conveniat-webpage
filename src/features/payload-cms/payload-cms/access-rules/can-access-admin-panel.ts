import { environmentVariables } from '@/config/environment-variables';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import type { Access, PayloadRequest } from 'payload';

const GROUPS_WITH_API_ACCESS = new Set(environmentVariables.GROUPS_WITH_API_ACCESS);

/**
 * Access control function that checks if the user is an editor.
 *
 * This is done by checking if the user is inside a hitobito group that is listed
 * in the `GROUPS_WITH_API_ACCESS` array.
 *
 * @param user
 */
export const canAccessAdminPanel: ({
  req,
}: {
  req: PayloadRequest;
}) => boolean | Promise<boolean> = ({ req: { user } }) => {
  if (!user) return false;
  return user.groups.some((group) => GROUPS_WITH_API_ACCESS.has(group.id));
};

export const canUserAccessAdminPanel: ({
  user,
}: {
  user: HitobitoNextAuthUser | undefined;
}) => boolean | Promise<boolean> = ({ user }) => {
  if (user === undefined) return false;
  return user.group_ids.some((id) => GROUPS_WITH_API_ACCESS.has(id));
};

/**
 * Access control function that checks if the user is an editor.
 * Only users that are in the `GROUPS_WITH_API_ACCESS` array can access the API.
 *
 * @param user
 */
export const canAccessAPI: Access = ({ req: { user } }) => {
  if (!user) return false;
  return user.groups.some((group) => GROUPS_WITH_API_ACCESS.has(group.id));
};
