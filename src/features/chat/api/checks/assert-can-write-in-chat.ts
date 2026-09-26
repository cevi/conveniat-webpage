import { Ability } from '@/lib/ability';
import { CapabilityAction, CapabilitySubject } from '@/lib/capabilities/types';
import { ChatCapability } from '@/lib/chat-shared';
import { ChatMembershipPermission } from '@/lib/prisma/client';
import { createLogger } from '@/utils/server-logger';
import { TRPCError } from '@trpc/server';

const logger = createLogger('chat:mutations');

/**
 * Throws unless messaging is allowed in the chat (globally, by its capabilities and its
 * status) and, for a thread reply, threads are enabled. Shared by everything that writes
 * into a chat, so a typing signal is allowed exactly where the message would be.
 */
export const assertWriteAbilities = async (
  chatId: string,
  parentId: string | undefined,
): Promise<void> => {
  const canSend = await Ability.can(CapabilityAction.Send, CapabilitySubject.Messages, chatId);
  if (!canSend) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Messaging is disabled in this chat or globally.',
    });
  }

  if (parentId !== undefined) {
    const canThread = await Ability.can(CapabilityAction.Create, CapabilitySubject.Threads, chatId);
    if (!canThread) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Threading is not enabled in this chat.',
      });
    }
  }
};

/**
 * Throws unless `userId` is a member who may write here: guests only as thread replies, and
 * only when the chat has both THREADS and THREAD_REPLIES.
 */
interface ChatForWriteCheck {
  capabilities: string[];
  chatMemberships: { userId: string; chatPermission: ChatMembershipPermission }[];
}

export const assertMembershipCanWrite: <C extends ChatForWriteCheck>(
  chat: C | null,
  chatId: string,
  userId: string,
  parentId?: string,
) => asserts chat is C = (chat, chatId, userId, parentId) => {
  const membership = chat?.chatMemberships.find((m) => m.userId === userId);
  if (!chat || !membership) {
    logger.warn('Message send rejected: sender is not a member of the chat', {
      'chat.id': chatId,
      'user.id': userId,
    });
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'You are not a member of this chat.',
    });
  }

  if (membership.chatPermission === ChatMembershipPermission.GUEST) {
    const isThreadReply = parentId !== undefined;
    const hasThreadsCapability = chat.capabilities.includes(ChatCapability.THREADS);
    const hasThreadRepliesCapability = chat.capabilities.includes(ChatCapability.THREAD_REPLIES);

    if (!isThreadReply || !hasThreadsCapability || !hasThreadRepliesCapability) {
      logger.warn('Message send rejected: guest outside an allowed thread reply context', {
        'chat.id': chatId,
        'user.id': userId,
      });
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to send messages in this chat.',
      });
    }
  }
};
