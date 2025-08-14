import { isUserMemberOfChat } from '@/features/chat/api/permission-checks/is-user-member-of-chat';
import { ChatMembershipPermission } from '@/lib/prisma/client';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';

/**
 * Checks if a user has permission to archive a chat.
 *
 * @param user - The UUID of the user to check.
 * @param chatMemberships - Array of chat memberships where each membership contains userId and chatPermission.
 *
 * @returns {boolean} - Returns true if the user has permission to archive the chat, false otherwise.
 */
export const canUserArchiveChat = (
  user: HitobitoNextAuthUser,
  chatMemberships: { userId: string; chatPermission: ChatMembershipPermission }[],
): boolean => {
  const userUuid = user.uuid;

  // verify integrity of userUuid
  if (userUuid.trim() === '') return false;

  // verify the integrity of chatMemberships
  if (!Array.isArray(chatMemberships) || chatMemberships.length === 0) return false;

  if (!isUserMemberOfChat(user, chatMemberships)) {
    console.warn(`User ${user.uuid} attempted to archive chat they are not a member of.`);
    throw new Error('You are not a member of this chat.');
  }

  // Find the user's membership in the chat
  const userMembership = chatMemberships.find((membership) => membership.userId === userUuid);

  // deny, if the user is not a member of the chat
  if (!userMembership) return false;

  const permissionsWhichAllowArchiving: ChatMembershipPermission[] = [
    ChatMembershipPermission.OWNER,
    ChatMembershipPermission.ADMIN,
  ];

  return permissionsWhichAllowArchiving.includes(userMembership.chatPermission);
};
