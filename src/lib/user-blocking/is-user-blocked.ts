import prisma from '@/lib/db/prisma';
import { BLOCKED_STATUS_CACHE_TTL_MS } from '@/lib/user-blocking/constants';

interface CacheEntry {
  blocked: boolean;
  expiresAt: number;
}

/**
 * Process-local cache of the blocked status.
 *
 * Blocking is enforced on every authenticated entry point (tRPC, SSE, server
 * components, the Payload auth strategy, ...). Without a cache this would add a
 * database round-trip to virtually every request. The TTL is very short
 * (see {@link BLOCKED_STATUS_CACHE_TTL_MS}) so that blocking a user still takes
 * effect nearly instantly, and the Payload hook additionally invalidates the
 * entry of the edited user directly.
 */
const blockedStatusCache = new Map<string, CacheEntry>();

/** Upper bound for the cache; prevents unbounded growth on long-running instances. */
const MAX_CACHE_ENTRIES = 10_000;

const pruneCache = (now: number): void => {
  for (const [key, entry] of blockedStatusCache) {
    if (entry.expiresAt <= now) blockedStatusCache.delete(key);
  }

  // Still too large (many active users within the TTL window): drop the oldest
  // entries — insertion order is preserved by `Map`.
  if (blockedStatusCache.size > MAX_CACHE_ENTRIES) {
    const excess = blockedStatusCache.size - MAX_CACHE_ENTRIES;
    let removed = 0;
    for (const key of blockedStatusCache.keys()) {
      blockedStatusCache.delete(key);
      removed++;
      if (removed >= excess) break;
    }
  }
};

/**
 * Drops cached blocked-statuses so that the next check hits the database again.
 *
 * Called from the Payload `users` collection hook whenever the blocked flag of a
 * user changes. Other instances of the app pick the change up after at most
 * {@link BLOCKED_STATUS_CACHE_TTL_MS}.
 *
 * @param userId - the user to invalidate; omit to clear the whole cache.
 */
export const invalidateBlockedStatusCache = (userId?: string): void => {
  if (userId === undefined) {
    blockedStatusCache.clear();
    return;
  }
  blockedStatusCache.delete(userId);
};

/**
 * Checks whether the given user has been blocked from using the app.
 *
 * The blocked flag lives in the Payload `users` collection and is mirrored into
 * the Postgres `User` table, which is what we query here (indexed primary key
 * lookup).
 *
 * Fails open: if the status cannot be determined (database hiccup, user not yet
 * synced to Postgres) the user is treated as not blocked. A blocked user is
 * always synced, because setting the flag writes the Postgres row.
 */
export const isUserBlocked = async (userId: string | undefined | null): Promise<boolean> => {
  if (typeof userId !== 'string' || userId === '') return false;

  const now = Date.now();
  const cached = blockedStatusCache.get(userId);
  if (cached !== undefined && cached.expiresAt > now) return cached.blocked;

  try {
    const user = await prisma.user.findUnique({
      where: { uuid: userId },
      select: { blocked: true },
    });

    const blocked = user?.blocked ?? false;
    pruneCache(now);
    blockedStatusCache.set(userId, { blocked, expiresAt: now + BLOCKED_STATUS_CACHE_TTL_MS });
    return blocked;
  } catch (error) {
    console.error('[isUserBlocked] Could not resolve blocked status for user', userId, error);
    return false;
  }
};

/**
 * Removes blocked users from a list of user ids.
 *
 * Used for outgoing communication (e.g. push notifications) so that blocked
 * users stop receiving anything from the app.
 */
export const filterOutBlockedUserIds = async (userIds: string[]): Promise<string[]> => {
  if (userIds.length === 0) return [];

  try {
    const blockedUsers = await prisma.user.findMany({
      where: { uuid: { in: userIds }, blocked: true },
      select: { uuid: true },
    });

    if (blockedUsers.length === 0) return userIds;

    const blockedIds = new Set(blockedUsers.map((user) => user.uuid));
    return userIds.filter((userId) => !blockedIds.has(userId));
  } catch (error) {
    console.error('[filterOutBlockedUserIds] Could not resolve blocked users', error);
    return userIds;
  }
};
