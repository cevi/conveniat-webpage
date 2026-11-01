import {
  ADMIN_PANEL_ROLES,
  getRoleGroupIds,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import type { BasePayload } from 'payload';

/**
 * Brings the stored `adminPanelAccess` of every user in line with the admin panel groups of this
 * deployment. A user's write keeps the flag current with their own groups, but the groups that
 * open the admin panel come from the environment, and a change there reaches nobody until they
 * log in with changed groups.
 *
 * Two writes on the raw collection, whatever the number of users: going through `payload.update`
 * would run the Postgres mirror and the other hooks once per user, on every start.
 *
 * @param payload The Payload instance.
 * @returns How many users changed.
 */
export const refreshAdminPanelAccess = async (payload: BasePayload): Promise<number> => {
  const users = payload.db.collections['users']?.collection;
  if (users === undefined) return 0;

  const groupIds = [...new Set(ADMIN_PANEL_ROLES.flatMap((role) => getRoleGroupIds(role)))];
  const granted = await users.updateMany(
    { 'groups.id': { $in: groupIds }, adminPanelAccess: { $ne: true } },
    { $set: { adminPanelAccess: true } },
  );
  const revoked = await users.updateMany(
    { 'groups.id': { $nin: groupIds }, adminPanelAccess: { $ne: false } },
    { $set: { adminPanelAccess: false } },
  );
  return granted.modifiedCount + revoked.modifiedCount;
};
