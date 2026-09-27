import type { Context } from '@/trpc/init';
import { createLogger } from '@/utils/server-logger';
import { TRPCError } from '@trpc/server';

const logger = createLogger('chat:access');

/**
 * Throws unless `userId` is a member of the chat, guests included. Chat ids are handed out
 * outside the chat (a course lists its chat, for example), so knowing one proves nothing.
 * The answer is NOT_FOUND, the same as for a chat that does not exist.
 */
export const assertChatMember = async (
  prisma: Context['prisma'],
  userId: string,
  chatId: string,
): Promise<void> => {
  const membership = await prisma.chatMembership.findUnique({
    where: { userId_chatId: { userId, chatId } },
    select: { userId: true },
  });

  if (!membership) {
    logger.warn('Chat access rejected: user is not a member of the chat', {
      'chat.id': chatId,
      'user.id': userId,
    });
    throw new TRPCError({ code: 'NOT_FOUND', message: 'You are not a member of this chat.' });
  }
};
