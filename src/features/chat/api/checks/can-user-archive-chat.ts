import { isUserMemberOfChat } from '@/features/chat/api/checks/is-user-member-of-chat';
import { ChatMembershipPermission, ChatType } from '@/lib/prisma/client';
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
  chat: {
    type: string;
    chatMemberships: { userId: string; chatPermission: ChatMembershipPermission }[];
  },
): boolean => {
  const userUuid = user.uuid;

  const chatMemberships = chat.chatMemberships;

  // verify the integrity of chatMemberships
  if (!Array.isArray(chatMemberships) || chatMemberships.length === 0) return false;

  // deny, if the user is not a member of the chat
  if (!isUserMemberOfChat(user, chatMemberships)) return false;

  // Find the user's membership in the chat
  const userMembership = chatMemberships.find((membership) => membership.userId === userUuid);

  // deny, if the user is not a member of the chat
  if (!userMembership) return false;

  const permissionsWhichAllowArchiving: ChatMembershipPermission[] = [
    ChatMembershipPermission.OWNER,
    ChatMembershipPermission.ADMIN,
  ];

  if (permissionsWhichAllowArchiving.includes(userMembership.chatPermission)) {
    return true;
  }

  if (chat.type === ChatType.EMERGENCY) {
    return true; // user can delete emergency chats regardless of their permission level
  }

  return false;
};
