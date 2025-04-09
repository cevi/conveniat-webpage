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

export const hasPermissions = async (
  permission: undefined | null | Permission,
): Promise<boolean> => {
  const userPerm = await auth();

  if (permission === null || permission === undefined) {
    return true;
  }

  const userGroups = (userPerm?.user as UserWithGroup).groups ?? undefined;

  if (userGroups === undefined) {
    return true;
  }

  const userGroupIds = new Set(userGroups.map((group) => group.id));

  // Check if any of the user's group IDs match the permission groups
  const hasPermission = permission.permissions.some((permissionGroup) =>
    userGroupIds.has(permissionGroup.group_id),
  );

  return hasPermission;
};
