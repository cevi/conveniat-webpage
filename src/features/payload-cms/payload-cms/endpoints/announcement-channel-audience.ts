import { hasAdminOrWebAccess, isRole } from '@/features/payload-cms/payload-cms/access-rules/roles';
import type { ChannelAudience } from '@/features/payload-cms/payload-cms/utils/announcement-channel-audience';
import { findAudienceUserIds } from '@/features/payload-cms/payload-cms/utils/announcement-channel-audience';
import type { PayloadHandler } from 'payload';

/** A Cevi.DB group an editor can pick as the audience of a channel. */
export interface CeviGroupSuggestion {
  id: number;
  name: string;
  /** How many logged-in users are in the group; 0 for a Hof or function nobody logged in to. */
  members: number;
}

/** Most users the camp will have; the login creates one per participant. */
const MAX_USERS = 20_000;

/** Most Höfe and functions the camp has; far more than it will ever have. */
const MAX_SYNCED_GROUPS = 1000;

const TARGET_TYPES = new Set<ChannelAudience['targetType']>([
  'all',
  'roles',
  'cevi_groups',
  'avps',
]);

const toGroupId = (value: unknown): number | undefined => {
  const id = typeof value === 'string' ? Number(value.trim()) : value;
  return typeof id === 'number' && Number.isInteger(id) && id > 0 ? id : undefined;
};

/**
 * Every Cevi.DB group the camp knows of, for the group picker of a channel: the groups of the
 * users as of their last login, the groups of the functions and the groups of the Höfe. A group
 * outside these can still be typed in by its ID.
 */
export const groupSuggestionsHandler: PayloadHandler = async (request) => {
  if (!hasAdminOrWebAccess({ req: request })) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { payload } = request;
  const [users, funktionen, hoefe] = await Promise.all([
    payload.find({
      collection: 'users',
      depth: 0,
      limit: MAX_USERS,
      pagination: false,
      overrideAccess: true,
      select: { groups: true },
    }),
    payload.find({
      collection: 'funktionen',
      depth: 0,
      limit: MAX_SYNCED_GROUPS,
      pagination: false,
      overrideAccess: true,
      select: { groupId: true, groupName: true },
    }),
    payload.find({
      collection: 'hoefe',
      depth: 0,
      limit: MAX_SYNCED_GROUPS,
      pagination: false,
      overrideAccess: true,
      select: { groupId: true, name: true },
    }),
  ]);

  const groups = new Map<number, CeviGroupSuggestion>();
  const add = (id: number | undefined, name: string | null | undefined, member: boolean): void => {
    if (id === undefined) return;
    const known = groups.get(id) ?? { id, name: '', members: 0 };
    if (known.name === '' && typeof name === 'string') known.name = name.trim();
    if (member) known.members += 1;
    groups.set(id, known);
  };

  for (const user of users.docs) {
    const userGroups: unknown[] = Array.isArray(user.groups) ? user.groups : [];
    // a user holding two roles in one group is still one member of it
    const seen = new Set<number>();
    for (const group of userGroups) {
      const { id, name } = (group ?? {}) as { id?: unknown; name?: unknown };
      const groupId = toGroupId(id);
      if (groupId === undefined || seen.has(groupId)) continue;
      seen.add(groupId);
      add(groupId, typeof name === 'string' ? name : undefined, true);
    }
  }
  for (const funktion of funktionen.docs)
    add(toGroupId(funktion.groupId), funktion.groupName, false);
  for (const hof of hoefe.docs) add(toGroupId(hof.groupId), hof.name, false);

  const suggestions = [...groups.values()].toSorted((a, b) => {
    const byName = a.name.localeCompare(b.name, 'de');
    return byName === 0 ? a.id - b.id : byName;
  });
  return Response.json({ groups: suggestions });
};

/** Reads an audience out of a request body, dropping whatever does not belong to one. */
const parseAudience = (body: unknown): ChannelAudience | undefined => {
  const { targetType, targetRoles, targetCeviGroups } = (body ?? {}) as Record<string, unknown>;
  if (!TARGET_TYPES.has(targetType as ChannelAudience['targetType'])) return undefined;
  return {
    targetType: targetType as ChannelAudience['targetType'],
    targetRoles: Array.isArray(targetRoles) ? targetRoles.filter((role) => isRole(role)) : [],
    targetCeviGroups: (Array.isArray(targetCeviGroups) ? targetCeviGroups : []).flatMap(
      (group: unknown) => {
        const groupId = toGroupId((group as { groupId?: unknown } | null)?.groupId);
        return groupId === undefined ? [] : [{ groupId }];
      },
    ),
  };
};

/**
 * How many logged-in users the audience being edited reaches, before it is saved. Saving
 * applies the same rule, so the number matches the members the chat will have.
 */
export const audiencePreviewHandler: PayloadHandler = async (request) => {
  if (!hasAdminOrWebAccess({ req: request })) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json?.();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const audience = parseAudience(body);
  if (audience === undefined) {
    return Response.json({ error: 'Unknown target type' }, { status: 400 });
  }

  const userIds = await findAudienceUserIds(request.payload, audience, request);
  return Response.json({ count: userIds.length });
};
