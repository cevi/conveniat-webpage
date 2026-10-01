import { environmentVariables } from '@/config/environment-variables';
import {
  findHoefe,
  getAdministeredGroupIds,
} from '@/features/payload-cms/payload-cms/access-rules/can-access-hof-dashboard';
import type { Roles } from '@/features/payload-cms/payload-cms/access-rules/roles';
import {
  ADMIN_PANEL_ROLES,
  EDITOR_ROLES,
  getUserGroups,
  hasAccessToThisUser,
  HOF_DASHBOARD_REVIEWER_ROLES,
  listRoleGroups,
  MATERIAL_DEPOT_ROLES,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import type {
  AdminEntity,
  EntityAccess,
} from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import {
  evaluateEntityAccess,
  isHiddenInAdmin,
} from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import { formatUserFullName } from '@/utils/format-user-name';
import type { PayloadRequest, TypedUser } from 'payload';
import { createLocalReq } from 'payload';

/**
 * What a role opens outside the collections and globals. Each entry is the role set the code
 * itself checks, so the overview cannot drift from it.
 */
export const CAPABILITIES = {
  adminPanel: ADMIN_PANEL_ROLES,
  editor: EDITOR_ROLES,
  materialDepot: MATERIAL_DEPOT_ROLES,
  hofDashboard: HOF_DASHBOARD_REVIEWER_ROLES,
} as const satisfies Record<string, Roles[]>;

export type Capability = keyof typeof CAPABILITIES;

/** The capabilities this deployment has, in display order. */
export const listCapabilities = (): Capability[] => {
  const capabilities: Capability[] = ['adminPanel', 'editor'];
  if (environmentVariables.FEATURE_ENABLE_MATERIAL_MANAGEMENT) capabilities.push('materialDepot');
  if (environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD) capabilities.push('hofDashboard');
  return capabilities;
};

/** Everything the overview shows for one subject: a Cevi.DB group, or a person. */
export interface SubjectAccess {
  capabilities: Record<Capability, boolean>;
  /** One entry per entity, in the order of the entity list. */
  entities: EntityAccess[];
}

interface CeviDatabaseGroup {
  id: number;
  name?: string | null;
  role_class?: string | null;
}

/**
 * Runs the real access rules for a user. For a group that is a stand-in user holding only that
 * group; the rules read nothing but `req.user`, so that membership is the whole subject.
 */
const evaluateSubject = async (
  user: TypedUser,
  entities: AdminEntity[],
  request: PayloadRequest,
): Promise<SubjectAccess> => {
  const subjectRequest = await createLocalReq(
    { user, req: { i18n: request.i18n } },
    request.payload,
  );
  return {
    capabilities: Object.fromEntries(
      Object.entries(CAPABILITIES).map(([capability, requiredRoles]) => [
        capability,
        hasAccessToThisUser({ user: { groups: getUserGroups(user) }, requiredRoles }),
      ]),
    ) as Record<Capability, boolean>,
    entities: await Promise.all(
      entities.map(async (entity) => ({
        operations: await evaluateEntityAccess(entity, subjectRequest),
        hiddenInAdmin: isHiddenInAdmin(entity, user),
      })),
    ),
  };
};

const standInUser = (request: PayloadRequest, groupIds: number[]): TypedUser =>
  ({
    id: `access-overview-${groupIds.join('-')}`,
    collection: request.payload.config.admin.user,
    groups: groupIds.map((id) => ({ id })),
  }) as unknown as TypedUser;

/** The members a group lists by name; a larger group shows the count for the rest. */
const MAX_LISTED_MEMBERS = 30;

const personName = (user: {
  id: string;
  fullName?: string | null;
  nickname?: string | null;
}): string => {
  const name = formatUserFullName(user.fullName ?? undefined, user.nickname ?? undefined);
  return name === '' ? user.id : name;
};

/** A Cevi.DB group that holds a role, as a column of the overview. */
export interface GroupColumn {
  groupId: number;
  /** The name of the group in Cevi.DB, known once one of its members has logged in. */
  name: string | undefined;
  roles: Roles[];
  /** How many people who have logged in are in the group. */
  memberCount: number;
  /** The first members by name, each a person the overview can explain. */
  members: { id: string; name: string }[];
  access: SubjectAccess;
}

/**
 * One column per Cevi.DB group that holds a role. The column is the group, not the role, because
 * the group is what a person is in: a group holding three roles has the rights of all three, and
 * three columns for it would be three times the same.
 */
export const loadGroupColumns = async (
  entities: AdminEntity[],
  request: PayloadRequest,
): Promise<GroupColumn[]> =>
  Promise.all(
    listRoleGroups().map(async ({ groupId, roles }) => {
      const [members, access] = await Promise.all([
        request.payload.find({
          collection: 'users',
          where: { 'groups.id': { equals: groupId } },
          depth: 0,
          limit: MAX_LISTED_MEMBERS,
          select: { groups: true, fullName: true, nickname: true },
          sort: 'fullName',
        }),
        evaluateSubject(standInUser(request, [groupId]), entities, request),
      ]);
      const memberGroups = (members.docs[0]?.groups ?? []) as CeviDatabaseGroup[];
      return {
        groupId,
        name: memberGroups.find((group) => group.id === groupId)?.name ?? undefined,
        roles,
        memberCount: members.totalDocs,
        members: members.docs.map((member) => ({ id: member.id, name: personName(member) })),
        access,
      };
    }),
  );

/** What every logged-in person may do, role or not: the stand-in user is in no group at all. */
export const loadEveryoneAccess = (
  entities: AdminEntity[],
  request: PayloadRequest,
): Promise<SubjectAccess> => evaluateSubject(standInUser(request, []), entities, request);

/** The person the overview explains. */
export interface Person {
  id: string;
  /** Name and Cevi name. */
  name: string;
  /** The name with the email, to tell two people of the same name apart. */
  label: string;
  /** The groups as of the person's last login, which is also what the access rules see. */
  groups: { id: number; name: string | undefined }[];
  /** The Höfe whose dashboard the person opens through their role in the Hof's own group. */
  hofDashboardHoefe: string[];
  access: SubjectAccess;
}

/**
 * Loads a person and evaluates the access rules as that person. Returns undefined for an id that
 * names nobody, so a stale link falls back to the admin's own access.
 */
export const loadPerson = async (
  id: string,
  entities: AdminEntity[],
  request: PayloadRequest,
): Promise<Person | undefined> => {
  const user = await request.payload.findByID({
    collection: 'users',
    id,
    depth: 0,
    disableErrors: true,
  });
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!user) return undefined;

  const groups = (Array.isArray(user.groups) ? user.groups : []) as CeviDatabaseGroup[];
  const administeredGroupIds = environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD
    ? getAdministeredGroupIds(groups)
    : [];
  const [access, hoefe] = await Promise.all([
    evaluateSubject({ ...user, collection: 'users' }, entities, request),
    administeredGroupIds.length === 0 ? [] : findHoefe(request.payload, administeredGroupIds),
  ]);

  return {
    id: user.id,
    name: personName(user),
    label: user.displayName ?? personName(user),
    groups: groups.map((group) => ({ id: group.id, name: group.name ?? undefined })),
    hofDashboardHoefe: hoefe.map((hof) => hof.name),
    access,
  };
};
