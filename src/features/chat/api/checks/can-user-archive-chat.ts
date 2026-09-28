import { isUserMemberOfChat } from '@/features/chat/api/checks/is-user-member-of-chat';
import { isChatArchived } from '@/lib/chat-shared';
import { ChatMembershipPermission, ChatType } from '@/lib/prisma/client';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';

/**
 * Checks if a user has permission to archive a chat.
 *
 * Archiving also removes the chat from the user's own view. Once a chat is archived, that removal
 * is the only effect left, so every member may do it, whatever their permission.
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
    archivedAt: Date | null;
    chatMemberships: { userId: string; chatPermission: ChatMembershipPermission }[];
  },
): boolean => {
  if (chat.type === ChatType.ANNOUNCEMENT) {
    return false;
  }

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

  if (isChatArchived(chat)) return true;

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
