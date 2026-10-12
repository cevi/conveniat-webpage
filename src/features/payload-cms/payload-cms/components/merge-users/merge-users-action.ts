'use server';

import { isFullAdmin } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { mergeUsers } from '@/features/payload-cms/payload-cms/views/merge-users-data';
import { createLogger } from '@/utils/server-logger';
import config from '@payload-config';
import { headers } from 'next/headers';
import { createLocalReq, getPayload } from 'payload';
import { z } from 'zod';

/*
 * Server action of the merge page in the admin panel. Payload admin components cannot reach
 * tRPC, which is why it exists; the app never calls it.
 */

const logger = createLogger('merge-users');

const mergeSchema = z.object({ sourceId: z.string().min(1), targetId: z.string().min(1) });

export type MergeUsersResult = { ok: true } | { ok: false; reason: 'forbidden' | 'failed' };

/**
 * Merges one user into another and deletes the first. A server action is a public endpoint, so
 * it resolves the admin from the request cookies itself; only full admins may merge.
 */
export const mergeUsersAction = async (
  input: z.input<typeof mergeSchema>,
): Promise<MergeUsersResult> => {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  if (!user) return { ok: false, reason: 'forbidden' };
  const request = await createLocalReq({ user }, payload);
  if (!isFullAdmin({ req: request })) return { ok: false, reason: 'forbidden' };

  const parsed = mergeSchema.safeParse(input);
  // merging the account one is logged in with would delete it under the running session
  if (!parsed.success || parsed.data.sourceId === parsed.data.targetId) {
    return { ok: false, reason: 'failed' };
  }
  const { sourceId, targetId } = parsed.data;
  if (sourceId === String(user.id)) return { ok: false, reason: 'failed' };

  const attributes = {
    'merge.source_user_uuid': sourceId,
    'merge.target_user_uuid': targetId,
    'auth.user_uuid': String(user.id),
  };
  try {
    await mergeUsers(payload, sourceId, targetId);
    logger.info('Merged two users', attributes);
    return { ok: true };
  } catch (error: unknown) {
    logger.error('Merging two users failed', { ...attributes, error });
    return { ok: false, reason: 'failed' };
  }
};
