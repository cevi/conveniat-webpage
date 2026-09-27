import { createLogger } from '@/utils/server-logger';

const logger = createLogger('chat:queries');

export interface CmsUserName {
  fullName?: string | undefined;
  nickname?: string | null | undefined;
}

/**
 * Looks up the Payload names of exactly the given chat users, keyed by their uuid.
 *
 * Asks for the ids it needs instead of a page of all users, so the answer is complete however
 * many users there are and the query stays as small as the chat on screen. Resolves to an empty
 * map when Payload is unavailable; callers then fall back to the Postgres user names.
 *
 * @param userIds - uuids of the users whose names are shown
 * @param logContext - attributes added to the warning when the lookup fails
 * @returns the Payload names of the users that have one
 */
export const findCmsUserNames = async (
  userIds: string[],
  logContext: Record<string, unknown> = {},
): Promise<Map<string, CmsUserName>> => {
  const names = new Map<string, CmsUserName>();
  const uniqueIds = [...new Set(userIds)];
  if (uniqueIds.length === 0) return names;

  try {
    const { getPayload } = await import('payload');
    const { default: config } = await import('@payload-config');
    const payload = await getPayload({ config });

    const cmsUsers = await payload.find({
      collection: 'users',
      where: { id: { in: uniqueIds } },
      select: { fullName: true, nickname: true },
      pagination: false,
      depth: 0,
    });

    for (const cmsUser of cmsUsers.docs) {
      names.set(cmsUser.id, { fullName: cmsUser.fullName, nickname: cmsUser.nickname });
    }
  } catch (error) {
    logger.warn('Falling back to prisma user names, the Payload user query failed', {
      error,
      ...logContext,
    });
  }

  return names;
};
