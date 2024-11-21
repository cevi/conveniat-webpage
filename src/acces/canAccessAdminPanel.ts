import { Access, PayloadRequest } from 'payload';

const GROUPS_WITH_API_ACCESS = [1];

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
  req: PayloadRequest
}) => boolean | Promise<boolean> = ({ req: { user } }) => {
  if (!user) return false;
  return user.groups.some((group) => GROUPS_WITH_API_ACCESS.includes(group.id));
};

/**
 * Access control function that checks if the user is an editor.
 * Only users that are in the `GROUPS_WITH_API_ACCESS` array can access the API.
 *
 * @param user
 */
export const canAccessAPI: Access = ({ req: { user } }) => {
  if (!user) return false;
  return user.groups.some((group) => GROUPS_WITH_API_ACCESS.includes(group.id));
};
