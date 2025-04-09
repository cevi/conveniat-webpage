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

  const userGroups = (userPerm?.user as UserWithGroup).groups;

  // if not logged in, page is accessible if no permission is required
  if (userGroups === undefined) {
    return permission === null || permission === undefined;
  }

  const userGroupIds = new Set(userGroups.map((group) => group.id));
  const permissionGroups = permission?.permissions ?? [];

  // Check if any of the user's group IDs match the permission groups
  const hasPermission = permissionGroups.some((permissionGroup) =>
    userGroupIds.has(permissionGroup.group_id),
  );

  return hasPermission;
};
