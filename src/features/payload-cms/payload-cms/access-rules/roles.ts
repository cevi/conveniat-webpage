/*
4 roles:
- full admin: can do everything
- web core team: can create collection entries
- translation team: can read and update collection entries, but not create or delete
- program team: only allowed users (field allowsEditsByUser on some colletions)
*/

import { environmentVariables } from '@/config/environment-variables';
import type { PayloadRequest, Where } from 'payload';

const CEVIDB_GROUP_FULL_ADMIN = environmentVariables.CEVIDB_GROUP_FULL_ADMIN;
const CEVIDB_GROUP_WEB_CORE_TEAM = environmentVariables.CEVIDB_GROUP_WEB_CORE_TEAM;
const CEVIDB_GROUP_TRANSLATION_TEAM = environmentVariables.CEVIDB_GROUP_TRANSLATION_TEAM;
const CEVIDB_GROUP_PROGRAM_TEAM = environmentVariables.CEVIDB_GROUP_PROGRAM_TEAM;

// create enum for roles
export enum Roles {
  FullAdmin = 'full-admin',
  WebCoreTeam = 'web-core-team',
  TranslationTeam = 'translation-team',
  ProgramTeam = 'program-team',
}

export const isFullAdmin: ({ req }: { req: PayloadRequest }) => boolean | Promise<boolean> = ({
  req: { user },
}) => {
  if (!user) return false;
  return user.groups.some((group) => group.id === CEVIDB_GROUP_FULL_ADMIN);
};

export const isWebCoreTeam: ({ req }: { req: PayloadRequest }) => boolean | Promise<boolean> = ({
  req: { user },
}) => {
  if (!user) return false;
  return user.groups.some((group) => group.id === CEVIDB_GROUP_WEB_CORE_TEAM);
};

export const isTranslationTeam: ({
  req,
}: {
  req: PayloadRequest;
}) => boolean | Promise<boolean> = ({ req: { user } }) => {
  if (!user) return false;
  return user.groups.some((group) => group.id === CEVIDB_GROUP_TRANSLATION_TEAM);
};

export const isProgramTeam: ({ req }: { req: PayloadRequest }) => boolean | Promise<boolean> = ({
  req: { user },
}) => {
  if (!user) return false;
  return user.groups.some((group) => group.id === CEVIDB_GROUP_PROGRAM_TEAM);
};

export const hasAccessToThisUser: ({
  user,
  requiredRoles,
}: {
  user: { groups?: { id: number }[]; group_ids?: number[] };
  requiredRoles: Roles[];
}) => boolean | Promise<boolean> = ({ user, requiredRoles }) => {
  let userGroupIds: number[] = [];

  userGroupIds =
    user.groups === undefined ? (user.group_ids ?? []) : user.groups.map((group) => group.id);

  // if any of the user's groups match any of the required roles, return true
  if (requiredRoles.includes(Roles.FullAdmin) && userGroupIds.includes(CEVIDB_GROUP_FULL_ADMIN)) {
    return true;
  }
  if (
    requiredRoles.includes(Roles.WebCoreTeam) &&
    userGroupIds.includes(CEVIDB_GROUP_WEB_CORE_TEAM)
  ) {
    return true;
  }
  if (
    requiredRoles.includes(Roles.TranslationTeam) &&
    userGroupIds.includes(CEVIDB_GROUP_TRANSLATION_TEAM)
  ) {
    return true;
  }
  if (
    requiredRoles.includes(Roles.ProgramTeam) &&
    userGroupIds.includes(CEVIDB_GROUP_PROGRAM_TEAM)
  ) {
    return true;
  }

  return false;
};

export const hasAccessToThis: ({
  req,
  requiredRoles,
}: {
  req: PayloadRequest;
  requiredRoles: Roles[];
}) => boolean | Promise<boolean> = ({ req: { user }, requiredRoles }) => {
  return hasAccessToThisUser({ user: { groups: user?.groups ?? [] }, requiredRoles });
};

export const hasAdminOrWebAccess: ({
  req,
}: {
  req: PayloadRequest;
}) => boolean | Promise<boolean> = ({ req }) => {
  return hasAccessToThis({ req, requiredRoles: [Roles.FullAdmin, Roles.WebCoreTeam] });
};
export const hasAccessToThisHelper = ({
  requiredRoles,
}: {
  requiredRoles: Roles[];
}): (({ req }: { req: PayloadRequest }) => boolean | Promise<boolean>) => {
  return ({ req }: { req: PayloadRequest }) => hasAccessToThis({ req, requiredRoles });
};

export const ProgramTeamAccessForGenericPage = ({
  req,
}: {
  req: PayloadRequest;
}): boolean | Where => {
  // program team has access if the user is in the program team group and the page allows edits by user

  // if user is higher privileged, grant access
  if (
    hasAccessToThis({
      req,
      requiredRoles: [Roles.FullAdmin, Roles.WebCoreTeam, Roles.TranslationTeam],
    })
  ) {
    return true;
  }

  if (!isProgramTeam({ req })) return false;

  // return the query to filter if the user is in the allowsEditsByUser field of the page
  const query: Where = {
    allowsEditsByUser: {
      contains: req.user?.id,
    },
  };

  return query;
};
