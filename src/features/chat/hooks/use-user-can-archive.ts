import { ChatMembershipPermission, ChatType } from '@/lib/prisma';
import { trpc } from '@/trpc/client';

/**
 * Checks if the user can archive a chat.
 * @returns An object containing the chatId if archiving is allowed.
 */
export const useUserCanArchiveChat = (chatId: string): boolean => {
  const trpcUtils = trpc.useUtils();
  const chatData = trpcUtils.chat.chatDetails.getData({ chatId: chatId });
  if (!chatData) return false;

  if (chatData.type === ChatType.EMERGENCY) return true;

  // check permission of user
  // TODO: unify with can-user-archive-chat.ts in src/features/chat/api/checks

  const memberships = chatData.participants;
  const currentUser = trpcUtils.chat.user.getData({});

  if (!currentUser) return false;

  const currentUserMembership = memberships.find((m) => m.id === currentUser);

  const permissionsWhichAllowArchiving: ChatMembershipPermission[] = [
    ChatMembershipPermission.OWNER,
    ChatMembershipPermission.ADMIN,
  ];

  if (!currentUserMembership) return false;

  if (permissionsWhichAllowArchiving.includes(currentUserMembership.chatPermission)) {
    return true;
  }

  return false;
};
