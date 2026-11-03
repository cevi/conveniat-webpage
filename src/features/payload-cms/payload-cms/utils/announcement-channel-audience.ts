import { getAdministeredGroupIds } from '@/features/payload-cms/payload-cms/access-rules/can-access-hof-dashboard';
import { hasAccessToThisUser, isRole } from '@/features/payload-cms/payload-cms/access-rules/roles';
import type { AnnouncementChannel } from '@/features/payload-cms/payload-types';
import type { Payload, PayloadRequest } from 'payload';

/** Who a channel is for, as the editor chose it. */
export type ChannelAudience = Pick<
  AnnouncementChannel,
  'targetType' | 'targetRoles' | 'targetCeviGroups'
>;

/** One group of a user, as the login copies it from the Cevi.DB profile. */
interface CeviDatabaseGroup {
  id: number;
  role_class?: string | null;
}

/** What deciding an audience needs beyond the user: the Cevi.DB groups of the Höfe. */
export interface AudienceContext {
  hofGroupIds: ReadonlySet<string>;
}

/** Most Höfe the camp has; far more than it will ever have. */
const MAX_HOEFE = 1000;

/**
 * Loads what `isInChannelAudience` needs for the given channels. The Höfe are read only when a
 * channel targets the AVPs.
 */
export const loadAudienceContext = async (
  payload: Payload,
  audiences: readonly ChannelAudience[],
  request?: PayloadRequest,
): Promise<AudienceContext> => {
  if (!audiences.some((audience) => audience.targetType === 'avps')) {
    return { hofGroupIds: new Set() };
  }
  const { docs } = await payload.find({
    collection: 'hoefe',
    depth: 0,
    limit: MAX_HOEFE,
    pagination: false,
    overrideAccess: true,
    select: { groupId: true },
    ...(request === undefined ? {} : { req: request }),
  });
  return { hofGroupIds: new Set(docs.map((hof) => hof.groupId)) };
};

/** The groups field of a user, which is JSON and arrives untyped. */
const toGroups = (groups: unknown): CeviDatabaseGroup[] =>
  Array.isArray(groups)
    ? groups.filter(
        (group): group is CeviDatabaseGroup =>
          typeof group === 'object' &&
          group !== null &&
          typeof (group as { id?: unknown }).id === 'number',
      )
    : [];

/**
 * Whether a user with these Cevi.DB groups belongs to a channel's audience.
 *
 * An AVP is whoever may open a Hof's dashboard: the Adressverwalter of a Hof's own Cevi.DB
 * group. Cevi.DB has no role of its own for the Stellvertretung; she counts once she holds
 * the Adressverwalter role too.
 */
export const isInChannelAudience = (
  userGroups: unknown,
  audience: ChannelAudience,
  context: AudienceContext,
): boolean => {
  const groups = toGroups(userGroups);
  switch (audience.targetType) {
    case 'all': {
      return true;
    }
    case 'roles': {
      return hasAccessToThisUser({
        user: { groups },
        requiredRoles: (audience.targetRoles ?? []).filter((role) => isRole(role)),
      });
    }
    case 'cevi_groups': {
      const groupIds = new Set(groups.map((group) => group.id));
      return (audience.targetCeviGroups ?? []).some((target) => groupIds.has(target.groupId));
    }
    case 'avps': {
      return getAdministeredGroupIds(groups).some((groupId) => context.hofGroupIds.has(groupId));
    }
    default: {
      return false;
    }
  }
};

/** Most users the camp will have; the login creates one per participant. */
export const MAX_USERS = 20_000;

/**
 * The ids of every logged-in user in a channel's audience. People who never logged in have no
 * user yet; the login adds them to their channels.
 */
export const findAudienceUserIds = async (
  payload: Payload,
  audience: ChannelAudience,
  request?: PayloadRequest,
): Promise<string[]> => {
  const [context, users] = await Promise.all([
    loadAudienceContext(payload, [audience], request),
    payload.find({
      collection: 'users',
      depth: 0,
      limit: MAX_USERS,
      pagination: false,
      overrideAccess: true,
      select: { groups: true },
      ...(request === undefined ? {} : { req: request }),
    }),
  ]);
  return users.docs
    .filter((user) => isInChannelAudience(user.groups, audience, context))
    .map((user) => user.id);
};
