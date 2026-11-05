import { getAdministeredGroupIds } from '@/features/payload-cms/payload-cms/access-rules/can-access-hof-dashboard';
import { hasAccessToThisUser, isRole } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { toHofIds } from '@/features/payload-cms/payload-cms/utils/hof-membership';
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

/** What deciding an audience reads off a user: both fields are kept by the syncs. */
export interface AudienceUser {
  groups?: unknown;
  avpHoefe?: unknown;
}

/**
 * Whether a user belongs to a channel's audience.
 *
 * Cevi.DB shows an AVP two ways: as Adressverwalter of the Hof's own group, which also opens
 * the Hof dashboard, and, once enrolled in the Hauptlager, as main leader of the Hof's camp
 * (`avpHoefe`). Either makes someone an AVP. Cevi.DB has no role of its own for the
 * Stellvertretung; she counts once she holds one of the two.
 */
export const isInChannelAudience = (
  user: AudienceUser,
  audience: ChannelAudience,
  context: AudienceContext,
): boolean => {
  const groups = toGroups(user.groups);
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
      return (
        toHofIds(user.avpHoefe).length > 0 ||
        getAdministeredGroupIds(groups).some((groupId) => context.hofGroupIds.has(groupId))
      );
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
      select: { groups: true, avpHoefe: true },
      ...(request === undefined ? {} : { req: request }),
    }),
  ]);
  return users.docs
    .filter((user) => isInChannelAudience(user, audience, context))
    .map((user) => user.id);
};
