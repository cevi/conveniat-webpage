'use server';

import { findChatByUuid } from '@/features/chat/api/database-interactions/find-chat-by-uuid';
import { markChatAsArchived } from '@/features/chat/api/database-interactions/mark-chat-as-archived';
import { markChatAsDeletedForUser } from '@/features/chat/api/database-interactions/mark-chat-as-deleted-for-user';
import { canUserArchiveChat } from '@/features/chat/api/permission-checks/can-user-archive-chat';
import { getApiUser } from '@/features/chat/api/permission-checks/get-api-user';
import prisma from '@/features/chat/database';

export const archiveChatMutation = async (
  chatUuid: string,
): Promise<{
  success: boolean;
}> => {
  const user = await getApiUser();

  await prisma
    .$transaction(async (tx) => {
      const chat = await findChatByUuid(chatUuid, tx);

      if (!canUserArchiveChat(user, chat.chatMemberships)) {
        console.warn(
          `User ${user.uuid} does not have sufficient permission to archive chat ${chatUuid}.`,
        );
        throw new Error(
          'You do not have permission to archive this chat. Only owners or admins can archive a chat.',
        );
      }

      await markChatAsArchived(chat, tx);
      await markChatAsDeletedForUser(chat, user, tx);

      console.log(`Chat ${chatUuid} archived successfully by user ${user.uuid}.`);
    })
    .catch((error: unknown) => {
      console.error('Error archiving chat:', error);
      // Re-throw specific errors for client-side handling if needed
      throw error instanceof Error &&
        (error.message === 'User not authenticated.' ||
          error.message === 'You are not a member of this chat.' ||
          error.message ===
            'You do not have permission to archive this chat. Only owners or admins can archive a chat.')
        ? error
        : new Error('Failed to archive chat.');
    });

  return { success: true };
};
