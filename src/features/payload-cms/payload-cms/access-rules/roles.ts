/*
Every right in the admin panel and in the app follows from a role, and a role is held through
membership in a Cevi.DB group. `ROLE_GROUP_IDS` is the one place a role meets its groups; nothing
else reads the group settings. A person in several groups holds the roles of all of them, and a
group may hold several roles.

- full admin: can do everything but the billing
- web core team: can create collection entries
- translation team: can read and update collection entries, but not create or delete
- program team: only the pages it was named on (field allowsEditsByUser on some collections)
- billing team: the billing in the admin panel and nothing else
- material team: runs the material depot in the app (/app/material)
- Hof dashboard reviewers: review what the Höfe hand in on the Hof dashboard, without the
  admin panel

`/admin/access-overview` renders these roles against every collection and global.
*/

import { environmentVariables } from '@/config/environment-variables';
import type { Access, ClientUser, FieldAccess, PayloadRequest, TypedUser, Where } from 'payload';

/** In the order the access overview lists them. */
export enum Roles {
  FullAdmin = 'full-admin',
  WebCoreTeam = 'web-core-team',
  TranslationTeam = 'translation-team',
  ProgramTeam = 'program-team',
  BillingTeam = 'billing-team',
  MaterialTeam = 'material-team',
  HofDashboardReviewer = 'hof-dashboard-reviewer',
}

/** The setting that names the Cevi.DB groups of a role, so the access overview can point at it. */
export const ROLE_ENVIRONMENT_VARIABLES = {
  [Roles.FullAdmin]: 'CEVIDB_GROUP_FULL_ADMIN',
  [Roles.WebCoreTeam]: 'CEVIDB_GROUP_WEB_CORE_TEAM',
  [Roles.TranslationTeam]: 'CEVIDB_GROUP_TRANSLATION_TEAM',
  [Roles.ProgramTeam]: 'CEVIDB_GROUP_PROGRAM_TEAM',
  [Roles.BillingTeam]: 'BILLING_ADMIN_GROUP_ID',
  [Roles.MaterialTeam]: 'CEVIDB_GROUP_MATERIAL_TEAM',
  [Roles.HofDashboardReviewer]: 'CEVIDB_GROUP_HOF_DASHBOARD_REVIEWERS',
} as const satisfies Record<Roles, keyof typeof environmentVariables>;

/** The Cevi.DB groups whose members hold a role. A role without a group has no holder. */
export const getRoleGroupIds = (role: Roles): number[] =>
  environmentVariables[ROLE_ENVIRONMENT_VARIABLES[role]];

/**
 * Whether a stored value names a role. A document keeps what an editor once picked, so a value
 * read from one is checked before it is looked up.
 */
export const isRole = (value: unknown): value is Roles =>
  Object.values(Roles).includes(value as Roles);

/** The roles a set of Cevi.DB groups adds up to, in the order of `Roles`. */
export const getRolesOfGroups = (groupIds: readonly number[]): Roles[] =>
  Object.values(Roles).filter((role) => getRoleGroupIds(role).some((id) => groupIds.includes(id)));

/** A Cevi.DB group that holds at least one role, with the roles it holds. */
export interface RoleGroup {
  groupId: number;
  roles: Roles[];
}

/** Every Cevi.DB group that holds a role, in the order of the first role it holds. */
export const listRoleGroups = (): RoleGroup[] => {
  const groupIds = new Set(Object.values(Roles).flatMap((role) => getRoleGroupIds(role)));
  return [...groupIds].map((groupId) => ({ groupId, roles: getRolesOfGroups([groupId]) }));
};

/**
 * Reads the CeviDB groups off an authenticated user.
 *
 * The MCP plugin registers `payload-mcp-api-keys` as a second auth-enabled collection,
 * which widens Payload's `TypedUser` from `User` to `User | PayloadMcpApiKey`. An API key
 * document never acts as the user in an access rule — the MCP endpoint resolves the bearer
 * key to the `User` it is bound to and runs every operation as that user — so narrowing
 * here is safe, and beats threading the widened union through every rule below.
 */
export const getUserGroups = (
  user: ClientUser | TypedUser | null | undefined,
): { id: number }[] => {
  if (!user || !('groups' in user) || !Array.isArray(user.groups)) return [];
  return user.groups as { id: number }[];
};

/**
 * Whether a user holds at least one of the roles. Takes both shapes a user comes in: the
 * Payload user with its `groups`, and the session user with its `group_ids`.
 */
export const hasAccessToThisUser: ({
  user,
  requiredRoles,
}: {
  user: { groups?: { id: number }[]; group_ids?: number[] };
  requiredRoles: Roles[];
}) => boolean = ({ user, requiredRoles }) => {
  const userGroupIds =
    user.groups === undefined ? (user.group_ids ?? []) : user.groups.map((group) => group.id);
  return requiredRoles.some((role) =>
    getRoleGroupIds(role).some((id) => userGroupIds.includes(id)),
  );
};

export const hasAccessToThis: ({
  req,
  requiredRoles,
}: {
  req: PayloadRequest;
  requiredRoles: Roles[];
}) => boolean = ({ req: { user }, requiredRoles }) => {
  return hasAccessToThisUser({ user: { groups: getUserGroups(user) }, requiredRoles });
};

export const isFullAdmin: ({ req }: { req: PayloadRequest }) => boolean = ({ req }) =>
  hasAccessToThis({ req, requiredRoles: [Roles.FullAdmin] });

export const isProgramTeam: ({ req }: { req: PayloadRequest }) => boolean = ({ req }) =>
  hasAccessToThis({ req, requiredRoles: [Roles.ProgramTeam] });

export const hasAdminOrWebAccess: ({ req }: { req: PayloadRequest }) => boolean = ({ req }) => {
  return hasAccessToThis({ req, requiredRoles: [Roles.FullAdmin, Roles.WebCoreTeam] });
};

/**
 * Admin, web core team and translation team: everyone who may change localized editorial
 * content. The translation team reaches a page through the same rule that lets the web team
 * write it, so the three roles share one name instead of a `requiredRoles` list per collection.
 */
export const hasEditorialAccess: ({ req }: { req: PayloadRequest }) => boolean = ({ req }) => {
  return hasAccessToThis({
    req,
    requiredRoles: [Roles.FullAdmin, Roles.WebCoreTeam, Roles.TranslationTeam],
  });
};

/**
 * The editors: everyone who works on content in the admin panel. An editor sees drafts and the
 * preview on the public site, may run the exports, and reads the reference data the content
 * points at, like the Quartiere and the Funktionen. What an editor may write is up to the rule
 * of each collection.
 */
export const EDITOR_ROLES: Roles[] = [
  Roles.FullAdmin,
  Roles.WebCoreTeam,
  Roles.TranslationTeam,
  Roles.ProgramTeam,
];

/**
 * Who may open the admin panel at all: the editors, and the two teams that come for one thing,
 * the billing team for the billing and the material team for the depot setup. Opening it grants
 * nothing by itself; every collection still decides with its own rule.
 */
export const ADMIN_PANEL_ROLES: Roles[] = [...EDITOR_ROLES, Roles.BillingTeam, Roles.MaterialTeam];

/**
 * Who reaches the billing: the billing team alone. Full admins are left out on purpose; one who
 * also does the billing is in both groups.
 */
export const BILLING_ROLES: Roles[] = [Roles.BillingTeam];

/**
 * Who runs the material depot: the material team and the full admins. Checked on the tRPC side
 * with the session user for the app, and by the depot setup in the admin panel, which is the
 * only admin page the material team may open.
 */
export const MATERIAL_DEPOT_ROLES: Roles[] = [Roles.FullAdmin, Roles.MaterialTeam];

/**
 * Who reviews what the Höfe hand in on the Hof dashboard and edits its settings: the full
 * admins, the web core team, and the Hof dashboard reviewers, the Ressorts Infrastruktur and
 * Programm, who get the dashboard without the web team's rights. The reviewers are not in
 * `ADMIN_PANEL_ROLES`, so the admin panel stays closed to them. Checked in Payload and, with
 * the session user, in tRPC.
 */
export const HOF_DASHBOARD_REVIEWER_ROLES: Roles[] = [
  Roles.FullAdmin,
  Roles.WebCoreTeam,
  Roles.HofDashboardReviewer,
];

/** Any editor, see `EDITOR_ROLES`. */
export const isEditor: ({ req }: { req: PayloadRequest }) => boolean = ({ req }) =>
  hasAccessToThis({ req, requiredRoles: EDITOR_ROLES });

/** Whether the user may open the admin panel, see `ADMIN_PANEL_ROLES`. */
export const canOpenAdminPanel: ({ req }: { req: PayloadRequest }) => boolean = ({ req }) =>
  hasAccessToThis({ req, requiredRoles: ADMIN_PANEL_ROLES });

/** The billing team, and the billing's own code, which marks its requests as internal. */
export const canAccessBilling: Access = ({ req }) => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (req.context?.['internal'] === true) return true;
  return hasAccessToThis({ req, requiredRoles: BILLING_ROLES });
};

/** `canAccessBilling` for a single field. */
export const canAccessBillingField: FieldAccess = ({ req }) => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (req.context?.['internal'] === true) return true;
  return hasAccessToThis({ req, requiredRoles: BILLING_ROLES });
};

/**
 * The billing team, the full admins and the web core team.
 *
 * For shared reference data the billing sync owns but other areas look up, like the Höfe:
 * billing maintains it, admin and web have to see it to build on it.
 */
export const hasBillingOrAdminOrWebAccess: Access = (args) => {
  if (hasAdminOrWebAccess({ req: args.req })) return true;
  return canAccessBilling(args);
};

export const hasAccessToThisHelper = ({
  requiredRoles,
}: {
  requiredRoles: Roles[];
}): (({ req }: { req: PayloadRequest }) => boolean) => {
  return ({ req }: { req: PayloadRequest }) => hasAccessToThis({ req, requiredRoles });
};

export const ProgramTeamAccessForGenericPage = ({
  req,
}: {
  req: PayloadRequest;
}): boolean | Where => {
  // program team has access if the user is in the program team group and the page allows edits by user

  // if user is higher privileged, grant access
  if (hasEditorialAccess({ req })) return true;

  if (!isProgramTeam({ req })) return false;

  // return the query to filter if the user is in the allowsEditsByUser field of the page
  const query: Where = {
    allowsEditsByUser: {
      contains: req.user?.id,
    },
  };

  return query;
};

export const shouldHideInAdminPanel: ({
  user,
}: {
  user: ClientUser | TypedUser | null;
}) => boolean = ({ user }) => {
  if (!user) return true;
  const allowedRoles = [Roles.FullAdmin, Roles.WebCoreTeam];
  const hasAccess = hasAccessToThisUser({
    user: { groups: getUserGroups(user) },
    requiredRoles: allowedRoles,
  });
  return !hasAccess;
};

export const shouldHideInAdminPanelIfNotAdmin: ({
  user,
}: {
  user: ClientUser | TypedUser | null;
}) => boolean = ({ user }) => {
  if (!user) return true;
  const allowedRoles = [Roles.FullAdmin];
  const hasAccess = hasAccessToThisUser({
    user: { groups: getUserGroups(user) },
    requiredRoles: allowedRoles,
  });
  return !hasAccess;
};
