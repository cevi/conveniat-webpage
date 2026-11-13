import { chatError } from '@/features/chat/api/chat-errors';
import { assertWriteAbilities } from '@/features/chat/api/checks/assert-can-write-in-chat';
import { chatMessageContentSchema } from '@/features/chat/limits';
import { chatPubSub } from '@/lib/db/chat-pubsub';
import poolPrisma from '@/lib/db/prisma';
import { MESSAGE_EDIT_WINDOW_MS } from '@/lib/forum-shared';
import { ChatType, MessageEventType, MessageType } from '@/lib/prisma/enums';
import { invariantError } from '@/trpc/error-formatter';
import { trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import { rateLimit } from '@/trpc/middleware/rate-limit';
import { createLogger } from '@/utils/server-logger';
import { z } from 'zod';

const logger = createLogger('chat:edit-message');

/**
 * Its sender changes the text of a message, in any chat, within a day of sending it. The new
 * text is a new `MessageContent` revision, so the old ones stay for moderators, and the message
 * reads "Bearbeitet" from then on. Images, quotes and the rest of the payload stay. A forum
 * post's title and text change with `forum.updateForumPost`, since the post has a title too;
 * its comments change here.
 */
export const editMessage = trpcBaseProcedure
  .input(z.object({ messageId: z.uuid(), text: chatMessageContentSchema }))
  .use(
    rateLimit({
      name: 'chat.editMessage',
      limit: 30,
      windowMs: 60 * 1000,
      refuse: () => chatError('TOO_MANY_REQUESTS', 'tooManyMessages'),
    }),
  )
  .use(databaseTransactionWrapper)
  .mutation(async ({ ctx, input }): Promise<{ editedAt: Date }> => {
    const { prisma, user } = ctx;
    // edits of one message one after the other, so each gets a revision of its own
    await prisma.$executeRaw`SELECT 1 FROM "Message" WHERE uuid = ${input.messageId} FOR UPDATE`;
    // someone outside the chat learns nothing, not even that the message exists
    const message = await prisma.message.findFirst({
      where: {
        uuid: input.messageId,
        chat: { chatMemberships: { some: { userId: user.uuid } } },
      },
      select: {
        uuid: true,
        chatId: true,
        type: true,
        senderId: true,
        parentId: true,
        createdAt: true,
        deletedAt: true,
        editedAt: true,
        forumPost: { select: { messageId: true } },
        chat: { select: { type: true } },
        contentVersions: {
          take: 1,
          orderBy: { revision: 'desc' },
          select: { revision: true, payload: true },
        },
      },
    });
    if (message?.deletedAt !== null) throw chatError('NOT_FOUND', 'messageGone');
    if (message.senderId !== user.uuid || message.type !== MessageType.TEXT_MSG) {
      throw invariantError('FORBIDDEN', 'Only the sender changes the text of a message.');
    }
    if (message.forumPost !== null) {
      throw invariantError('BAD_REQUEST', 'A forum post is changed with forum.updateForumPost.');
    }
    if (Date.now() - message.createdAt.getTime() > MESSAGE_EDIT_WINDOW_MS) {
      throw chatError('FORBIDDEN', 'editWindowOver');
    }
    await assertWriteAbilities(prisma, message.chatId, message.parentId ?? undefined);

    const latest = message.contentVersions[0];
    const previous = latest?.payload;
    const record =
      typeof previous === 'object' && previous !== null && !Array.isArray(previous)
        ? (previous as Record<string, unknown>)
        : {};
    // a replay of the same edit
    if (record['text'] === input.text && message.editedAt !== null) {
      return { editedAt: message.editedAt };
    }
    const editedAt = new Date();
    await prisma.messageContent.create({
      data: {
        messageId: message.uuid,
        revision: (latest?.revision ?? 0) + 1,
        payload: { ...record, text: input.text },
      },
    });
    await prisma.message.update({ where: { uuid: message.uuid }, data: { editedAt } });

    ctx.afterTransactionCommit(() => {
      logger.info('Message edited by its sender', {
        'chat.id': message.chatId,
        'message.id': message.uuid,
      });
      const event = {
        type: 'message_updated' as const,
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
        },
      };
      const isForum =
        message.chat.type === ChatType.FORUM || message.chat.type === ChatType.FORUM_CONVERSATION;
      // in a forum thread only some may see, only they hear of it
      const published =
        isForum && message.parentId !== null
          ? import('@/features/chat/api/forum/forum-visibility').then(
              async ({ findForumPostVisibility, publishForumThreadEvent }) => {
                const post = await findForumPostVisibility(poolPrisma, message.parentId ?? '');
                await (post === undefined
                  ? chatPubSub.publish(event)
                  : publishForumThreadEvent(poolPrisma, post, event));
              },
            )
          : chatPubSub.publish(event);
      published.catch((error: unknown) => {
        logger.error('Failed to publish an edited message', {
          error,
          'chat.id': message.chatId,
          'message.id': message.uuid,
        });
      });
    });
    return { editedAt };
  });
