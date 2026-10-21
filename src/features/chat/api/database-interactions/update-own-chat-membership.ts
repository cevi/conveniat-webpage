import { chatPubSub } from '@/lib/db/chat-pubsub';
import type { ChatType, Prisma } from '@/lib/prisma';
import type { PrismaClientOrTransaction } from '@/types/types';
import { createLogger } from '@/utils/server-logger';
import { TRPCError } from '@trpc/server';

const logger = createLogger('chat:mutations');

export interface OwnChatMembership {
  pinnedAt: Date | null;
  mutedAt: Date | null;
  markedUnread: boolean;
  chat: { type: ChatType };
}

/**
 * Reads the caller's own membership of a chat, for the settings that only concern them:
 * pinned, muted and marked unread. Throws FORBIDDEN when they are not a member.
 */
export const findOwnChatMembership = async (
  prisma: PrismaClientOrTransaction,
  userId: string,
  chatId: string,
): Promise<OwnChatMembership> => {
  const membership = await prisma.chatMembership.findUnique({
    where: { userId_chatId: { userId, chatId } },
    select: { pinnedAt: true, mutedAt: true, markedUnread: true, chat: { select: { type: true } } },
  });

  if (!membership) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not a member of this chat.' });
  }

  return membership;
};

/**
 * Writes a setting onto the caller's own membership, then tells their other devices to
 * refetch the chat list. The `new_chat` event on the personal channel is the one the chat
 * overview answers with a plain refetch, see `useChatSSE`.
 */
export const updateOwnChatMembership = async (
  prisma: PrismaClientOrTransaction,
  userId: string,
  chatId: string,
  data: Prisma.ChatMembershipUpdateInput,
): Promise<void> => {
  await prisma.chatMembership.update({
    where: { userId_chatId: { userId, chatId } },
    data,
  });

  chatPubSub
    .publish(userId, { type: 'new_chat', chatId, senderId: userId })
    .catch((error: unknown) => {
      logger.error('Failed to publish the chat list change to the own devices', {
        error,
        'chat.id': chatId,
        'user.id': userId,
      });
    });
};
