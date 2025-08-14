import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';

/**
 * Checks if a user is a member of a chat.
 *
 * @param user - The user object containing the userUuid.
 * @param chatMemberships - Array of chat memberships where each membership contains a userId.
 *
 * @returns {boolean} - Returns true if the user is a member of the chat, false otherwise.
 */
export const isUserMemberOfChat = (
  user: HitobitoNextAuthUser,
  chatMemberships: { userId: string }[],
): boolean => {
  const userUuid = user.uuid;

  // verify integrity of userUuid
  if (userUuid.trim() === '') return false;

  // verify the integrity of chatMemberships
  if (!Array.isArray(chatMemberships) || chatMemberships.length === 0) return false;

  return chatMemberships.some((membership) => membership.userId === userUuid);
};
