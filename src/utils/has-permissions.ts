import type { Permission } from '@/features/payload-cms/payload-types';
import type { Session } from 'next-auth';

export const isPermissionPublic = (permission: Permission | null | undefined): boolean => {
  return permission?.special_permissions?.public === true;
};

const isPermissionLoggedInRequired = async (
  permission: Permission | null | undefined,
  userSession?: Session | null,
): Promise<boolean> => {
  if (permission?.special_permissions?.logged_in === true) {
    if (userSession !== undefined) return userSession !== null;
    const { auth } = await import('@/utils/auth');
    const userPerm = await auth();
    return userPerm !== null;
  }
  return true;
};

const hasGroupPermissions = (
  permission: Permission | null | undefined,
  userGroupIds: number[] | undefined,
): boolean => {
  if (!permission?.permissions || permission.permissions.length === 0) {
    return true;
  }

  if (!userGroupIds || userGroupIds.length === 0) {
    return false;
  }

  const userGroupsSet = new Set(userGroupIds);
  const hasAccess = permission.permissions.some((permissionGroup) =>
    userGroupsSet.has(permissionGroup.group_id),
  );
  return hasAccess;
};

/**
 * Checks if the current user (passed as userSession or fetched via auth()) has permission.
 *
 * @param permission - The permission profile to check
 * @param userSession - Optional pre-fetched user session to avoid redundant auth() calls
 */
export const hasPermissions = async (
  permission: undefined | null | Permission,
  userSession?: Session | null,
): Promise<boolean> => {
  if (!permission) {
    return true;
  }

  if (isPermissionPublic(permission)) {
    return true;
  }

  const userPerm =
    userSession === undefined
      ? await (async (): Promise<Session | null> => {
          const { auth } = await import('@/utils/auth');
          return await auth();
        })()
      : userSession;

  if (!userPerm) {
    return false;
  }

  const userGroupIds = userPerm.user.group_ids;
  const isLoggedInOk = await isPermissionLoggedInRequired(permission, userPerm);
  const isGroupOk = hasGroupPermissions(permission, userGroupIds);
  return isLoggedInOk && isGroupOk;
};
