import { chatError } from '@/features/chat/api/chat-errors';
import { DEFAULT_MAX_GROUP_MEMBERS } from '@/features/payload-cms/payload-cms/globals/all-chats-management';
import config from '@payload-config';
import { getPayload } from 'payload';

/**
 * How many members, the creator included, a group created by a participant may have, as set
 * in the `all-chats-management` global.
 */
export const getMaxGroupMembers = async (): Promise<number> => {
  const payload = await getPayload({ config });
  const settings = await payload.findGlobal({ slug: 'all-chats-management', depth: 0 });
  // typed as always set, but missing until an editor saves the global for the first time
  const stored: unknown = settings.maxGroupMembers;
  return typeof stored === 'number' ? stored : DEFAULT_MAX_GROUP_MEMBERS;
};

/**
 * Refuses a participant's group that would grow past the configured size. Groups set up by
 * admins and announcement channels are filled through other procedures and stay unlimited.
 *
 * @param memberCount - the members the group would have, the creator included
 */
export const assertGroupSize = async (memberCount: number): Promise<void> => {
  const maxGroupMembers = await getMaxGroupMembers();
  if (memberCount > maxGroupMembers) {
    throw chatError('BAD_REQUEST', 'groupTooLarge', { max: maxGroupMembers });
  }
};
