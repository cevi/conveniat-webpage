import { assertChatNotArchived } from '@/features/chat/api/checks/assert-can-write-in-chat';
import { ChatCapability } from '@/lib/chat-shared';
import { chatPubSub } from '@/lib/db/chat-pubsub';
import { trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import type { StaticTranslationString } from '@/types/types';
import { createLogger } from '@/utils/server-logger';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

const logger = createLogger('chat:mutations');

/**
 * Room for the longest emoji a picker offers: a ZWJ family or a flag with a skin tone takes
 * up to 11 UTF-16 units. Anything longer is text, not an emoji.
 */
const EMOJI_MAX_LENGTH = 16;

/** As many as the reaction menu offers, so the app never runs into it. */
const MAX_REACTIONS_PER_USER_AND_MESSAGE = 6;

const tooManyReactionsText: StaticTranslationString = {
  de: `Du kannst auf eine Nachricht mit höchstens ${MAX_REACTIONS_PER_USER_AND_MESSAGE} verschiedenen Emojis reagieren.`,
  en: `You can react to a message with at most ${MAX_REACTIONS_PER_USER_AND_MESSAGE} different emojis.`,
  fr: `Tu peux réagir à un message avec au plus ${MAX_REACTIONS_PER_USER_AND_MESSAGE} emojis différents.`,
};

const toggleReactionInputSchema = z.object({
  messageId: z.string().uuid('Invalid message ID format.'),
  emoji: z.string().min(1, 'Emoji cannot be empty.').max(EMOJI_MAX_LENGTH, 'Emoji is too long.'),
});

export const toggleReaction = trpcBaseProcedure
  .input(toggleReactionInputSchema)
  .use(databaseTransactionWrapper)
  .mutation(async ({ input, ctx }) => {
    const { locale, user, prisma } = ctx;
    const { messageId, emoji } = input;

    // 1. Fetch the message to get its chatId
    const message = await prisma.message.findUnique({
      where: { uuid: messageId },
      include: {
        contentVersions: {
          orderBy: { revision: 'desc' },
          take: 1,
        },
      },
    });

    if (!message) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Message not found.',
      });
    }

    // 2. Fetch the chat details and the user's membership
    const chat = await prisma.chat.findUnique({
      where: { uuid: message.chatId },
      select: {
        uuid: true,
        capabilities: true,
        archivedAt: true,
        chatMemberships: {
          where: { userId: user.uuid },
          select: {
            chatPermission: true,
          },
        },
      },
    });

    const membership = chat?.chatMemberships[0];
    if (!chat || !membership) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You are not a member of this chat.',
      });
    }

    assertChatNotArchived(chat);

    // 3. Permission checks: Emoji reactions must be enabled for the chat
    if (!chat.capabilities.includes(ChatCapability.EMOJI_REACTIONS)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Emoji reactions are not enabled for this chat.',
      });
    }

    // 4. Toggle reaction: delete if exists, create if not
    const existingReaction = await prisma.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId: user.uuid,
          emoji,
        },
      },
    });

    if (existingReaction) {
      await prisma.messageReaction.delete({
        where: {
          uuid: existingReaction.uuid,
        },
      });
    } else {
      const reactionCount = await prisma.messageReaction.count({
        where: { messageId, userId: user.uuid },
      });
      if (reactionCount >= MAX_REACTIONS_PER_USER_AND_MESSAGE) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: tooManyReactionsText[locale] });
      }

      await prisma.messageReaction.create({
        data: {
          messageId,
          userId: user.uuid,
          emoji,
        },
      });
    }

    const content = message.contentVersions[0]?.payload ?? {};
    // 5. Publish the real-time event once the reaction is committed, so clients that
    // refetch on it read the new reaction.
    ctx.afterTransactionCommit(() => {
      chatPubSub
        .publish({
          type: 'message_updated',
          chatId: message.chatId,
          senderId: user.uuid,
          message: {
            id: message.uuid,
            createdAt: message.createdAt,
            messagePayload: content,
            senderId: message.senderId ?? undefined,
            status: 'STORED',
            type: message.type,
            parentId: message.parentId ?? undefined,
          },
        })
        .catch((error: unknown) => {
          logger.error('Failed to publish the message_updated event', {
            error,
            'chat.id': message.chatId,
            'message.id': message.uuid,
          });
        });
    });

    return { success: true };
  });
