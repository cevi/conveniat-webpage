import { chatPubSub } from '@/lib/db/chat-pubsub';
import { MessageEventType, MessageType } from '@/lib/prisma/client';
import { trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import { createLogger } from '@/utils/server-logger';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

const logger = createLogger('chat:mutations');

/** What a person writes themselves; alert questions and system messages are not theirs to take back. */
const DELETABLE_TYPES: ReadonlySet<string> = new Set([
  MessageType.TEXT_MSG,
  MessageType.IMAGE_MSG,
  MessageType.LOCATION_MSG,
]);

/**
 * Deletes a message for everyone. Only its sender may, at any time, as long as they are still a
 * member of the chat. The message keeps its place, so its thread and the quotes of it stay
 * where they are, but its content is never served again and its reactions go. A second call
 * changes nothing and answers with the time of the first.
 *
 * A push about the message that is still queued is dropped by the push queue, see
 * `deliverNextBatch`; one already sent stays on the phone.
 */
export const deleteMessage = trpcBaseProcedure
  .input(z.object({ messageId: z.uuid() }))
  .use(databaseTransactionWrapper)
  .mutation(async ({ input, ctx }): Promise<{ deletedAt: Date }> => {
    const { prisma, user } = ctx;
    const { messageId } = input;

    // Someone outside the chat learns nothing, not even that the message exists.
    const message = await prisma.message.findFirst({
      where: { uuid: messageId, chat: { chatMemberships: { some: { userId: user.uuid } } } },
      select: {
        uuid: true,
        chatId: true,
        senderId: true,
        type: true,
        parentId: true,
        createdAt: true,
        deletedAt: true,
      },
    });
    if (message === null) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Message not found.' });
    }

    if (message.senderId !== user.uuid || !DELETABLE_TYPES.has(message.type)) {
      logger.warn('Message deletion rejected: not the sender', {
        'chat.id': message.chatId,
        'message.id': message.uuid,
        'user.id': user.uuid,
      });
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only delete your own messages.' });
    }

    if (message.deletedAt !== null) return { deletedAt: message.deletedAt };

    const deletedAt = new Date();
    // Conditional, so two deletes that cross announce it only once.
    const { count } = await prisma.message.updateMany({
      // eslint-disable-next-line unicorn/no-null -- Prisma matches a SQL NULL only through null
      where: { uuid: message.uuid, deletedAt: null },
      data: { deletedAt, deletedById: user.uuid },
    });
    // the other one won, and its time stands
    if (count === 0) {
      const winner = await prisma.message.findUniqueOrThrow({
        where: { uuid: message.uuid },
        select: { deletedAt: true },
      });
      return { deletedAt: winner.deletedAt ?? deletedAt };
    }

    await prisma.messageReaction.deleteMany({ where: { messageId: message.uuid } });

    ctx.afterTransactionCommit(() => {
      logger.info('Message deleted by its sender', {
        'chat.id': message.chatId,
        'message.id': message.uuid,
        'message.type': message.type,
      });
      chatPubSub
        .publish({
          type: 'message_deleted',
          chatId: message.chatId,
          senderId: user.uuid,
          message: {
            id: message.uuid,
            createdAt: message.createdAt,
            messagePayload: {},
            senderId: user.uuid,
            status: MessageEventType.STORED,
            type: message.type,
            parentId: message.parentId ?? undefined,
            deletedAt,
          },
        })
        .catch((error: unknown) => {
          logger.error('Failed to publish the message_deleted event', {
            error,
            'chat.id': message.chatId,
            'message.id': message.uuid,
          });
        });
    });

    return { deletedAt };
  });
