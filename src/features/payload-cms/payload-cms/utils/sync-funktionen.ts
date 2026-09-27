import { refreshUserFunktionen } from '@/features/payload-cms/payload-cms/utils/funktionen';
import { FatalError } from '@/lib/hitobito/client';
import { SessionExpiredError } from '@/lib/hitobito/errors';
import type { GroupRoleHolder, GroupSummary } from '@/lib/hitobito/services/group.service';
import type { Payload } from 'payload';

/** Only the leaders of a group get its function; its members stay plain participants. */
export const LEITUNG_ROLE_CLASS = 'Group::DachverbandGremium::Leitung';

/**
 * What kind of failure stopped a sync, so a log query can tell an expired session, which an
 * editor fixes by storing a new cookie, from a Cevi.DB outage or a refused request.
 */
export const describeFunktionenSyncFailure = (error: unknown): string => {
  if (error instanceof SessionExpiredError) return 'session_expired';
  if (error instanceof FatalError) return 'refused';
  if (error instanceof Error && error.message.startsWith('No browser cookie')) return 'no_cookie';
  return 'error';
};

/** A safety stop, far above any real camp organisation. */
const MAX_GROUPS = 500;

/** What the sync needs from Cevi.DB. */
export interface FunktionenSource {
  getGroupName: (groupId: string) => Promise<string>;
  listSubgroups: (parentGroupId: string) => Promise<GroupSummary[]>;
  listPeopleWithRole: (groupId: string, roleClass: string) => Promise<GroupRoleHolder[]>;
}

/** A group with at least one leader, as found in Cevi.DB. */
interface FoundFunktion {
  groupId: string;
  groupName: string;
  personIds: string[];
}

/** A group that has leaders, as the sync reports it while it reads the tree. */
export interface FoundFunktionGroup {
  groupId: string;
  groupName: string;
  leaders: number;
}

/** How far a sync has got, for a progress bar. */
export type FunktionenSyncProgress =
  | { phase: 'discovering'; discoveredGroups: number }
  | {
      phase: 'reading';
      processedGroups: number;
      totalGroups: number;
      /** groups with leaders found since the previous report; append, do not replace */
      found: FoundFunktionGroup[];
    };

/** One line of the stream the admin panel reads while a sync runs. */
export type FunktionenSyncStreamMessage =
  | ({ type: 'progress' } & FunktionenSyncProgress)
  | { type: 'done'; result: FunktionenSyncResult }
  | { type: 'error'; error: string; failure: string };

export interface FunktionenSyncResult {
  groups: number;
  created: number;
  updated: number;
  removed: number;
  usersWritten: number;
}

/** The root group and every group below it, level by level. */
const walkGroupTree = async (
  source: FunktionenSource,
  rootGroupId: string,
  onProgress: (progress: FunktionenSyncProgress) => void,
): Promise<GroupSummary[]> => {
  const groups: GroupSummary[] = [
    { id: rootGroupId, name: await source.getGroupName(rootGroupId) },
  ];
  const seen = new Set([rootGroupId]);
  // the loop also visits the groups it appends, which is what walks the tree level by level
  for (const parent of groups) {
    for (const child of await source.listSubgroups(parent.id)) {
      if (seen.has(child.id)) continue;
      if (groups.length >= MAX_GROUPS) {
        throw new Error(`The group tree below ${rootGroupId} has more than ${MAX_GROUPS} groups`);
      }
      seen.add(child.id);
      groups.push(child);
    }
    onProgress({ phase: 'discovering', discoveredGroups: groups.length });
  }
  return groups;
};

const sameIds = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((id) => b.includes(id));

/**
 * Syncs the camp functions from the Cevi.DB tree below `rootGroupId`: every group with a
 * leader becomes a function held by its leaders. Everything is read first, so a Cevi.DB
 * error leaves the functions as they were instead of wiping them.
 *
 * A new function gets a German label suggested from the group name; after that only the
 * group name and the leaders follow Cevi.DB, the labels and the order belong to the editors.
 */
export const syncFunktionen = async (
  payload: Payload,
  source: FunktionenSource,
  rootGroupId: string,
  onProgress: (progress: FunktionenSyncProgress) => void = (): void => {},
): Promise<FunktionenSyncResult> => {
  const groups = await walkGroupTree(source, rootGroupId, onProgress);

  const found: FoundFunktion[] = [];
  for (const [index, group] of groups.entries()) {
    const leaders = await source.listPeopleWithRole(group.id, LEITUNG_ROLE_CLASS);
    const personIds = [...new Set(leaders.map((leader) => leader.personId))].filter(
      (id) => id !== '',
    );
    const funktion = { groupId: group.id, groupName: group.name, personIds };
    if (personIds.length > 0) found.push(funktion);
    onProgress({
      phase: 'reading',
      processedGroups: index + 1,
      totalGroups: groups.length,
      found:
        personIds.length > 0
          ? [{ groupId: group.id, groupName: group.name, leaders: personIds.length }]
          : [],
    });
  }

  const { docs: existing } = await payload.find({
    collection: 'funktionen',
    depth: 0,
    pagination: false,
    select: { groupId: true, groupName: true, personIds: true },
  });

  // No leader anywhere in the tree is far likelier a Cevi.DB answer gone wrong than a camp
  // without an organisation. Removing the last functions is left to an admin.
  if (found.length === 0 && existing.length > 0) {
    throw new Error(
      `No group below ${rootGroupId} has a leader in Cevi.DB; refusing to remove all ${String(existing.length)} functions`,
    );
  }

  let created = 0;
  let updated = 0;
  for (const funktion of found) {
    const current = existing.find((document_) => document_.groupId === funktion.groupId);
    if (current === undefined) {
      await payload.create({
        collection: 'funktionen',
        locale: 'de',
        data: { ...funktion, label: `Leitung ${funktion.groupName}`.trim() },
        context: { internal: true },
      });
      created += 1;
    } else if (
      current.groupName !== funktion.groupName ||
      !sameIds(current.personIds ?? [], funktion.personIds)
    ) {
      await payload.update({
        collection: 'funktionen',
        id: current.id,
        data: { groupName: funktion.groupName, personIds: funktion.personIds },
        context: { internal: true },
      });
      updated += 1;
    }
  }

  // a group without a leader, or gone from the tree, no longer is a function
  let removed = 0;
  for (const current of existing) {
    if (found.some((funktion) => funktion.groupId === current.groupId)) continue;
    await payload.delete({
      collection: 'funktionen',
      id: current.id,
      context: { internal: true },
    });
    removed += 1;
  }

  const usersWritten = await refreshUserFunktionen(payload);
  return { groups: groups.length, created, updated, removed, usersWritten };
};
