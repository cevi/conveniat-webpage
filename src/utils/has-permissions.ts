import type { Permission } from '@/features/payload-cms/payload-types';

export const isPermissionPublic = (permission: Permission | null | undefined): boolean => {
  return permission?.special_permissions?.public === true;
};

const isPermissionLoggedInRequired = async (
  permission: Permission | null | undefined,
): Promise<boolean> => {
  if (permission?.special_permissions?.logged_in === true) {
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

export const hasPermissions = async (
  permission: undefined | null | Permission,
): Promise<boolean> => {
  if (!permission) {
    return true;
  }

  if (isPermissionPublic(permission)) {
    return true;
  }

  const { auth } = await import('@/utils/auth');
  const userPerm = await auth();
  if (!userPerm) {
    return false;
  }

  const userGroupIds = userPerm.user.group_ids;
  const isLoggedInOk = await isPermissionLoggedInRequired(permission);
  const isGroupOk = hasGroupPermissions(permission, userGroupIds);
  return isLoggedInOk && isGroupOk;
};
