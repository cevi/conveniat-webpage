import { auth } from '@/auth/auth';
import { Permission } from '@/payload-types';

type UserWithGroup = {
  groups:
    | {
        id: number;
        role: string;
      }[]
    | undefined;
};

const isPermissionPublic = (permission: Permission | null | undefined): boolean => {
  return permission?.public === true;
};

const isPermissionLoggedInRequired = async (
  permission: Permission | null | undefined,
): Promise<boolean> => {
  if (permission?.logged_in === true) {
    const userPerm = await auth();
    return userPerm !== null;
  }
  return true;
};

const hasGroupPermissions = (
  permission: Permission | null | undefined,
  userGroups: { id: number; role: string }[] | undefined,
): boolean => {
  if (!permission?.permissions || !userGroups) {
    return true;
  }

  const userGroupIds = new Set(userGroups.map((group) => group.id));
  return permission.permissions.some((permissionGroup) =>
    userGroupIds.has(permissionGroup.group_id),
  );
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

  const userPerm = await auth();
  if (!userPerm) {
    return false;
  }

  const userGroups = (userPerm.user as UserWithGroup).groups;
  return (
    (await isPermissionLoggedInRequired(permission)) && hasGroupPermissions(permission, userGroups)
  );
};
