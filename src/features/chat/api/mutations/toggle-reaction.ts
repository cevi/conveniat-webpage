import { ChatCapability } from '@/lib/chat-shared';
import { chatPubSub } from '@/lib/db/chat-pubsub';
import { ChatMembershipPermission } from '@/lib/prisma/client';
import { trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

const toggleReactionInputSchema = z.object({
  messageId: z.string().uuid('Invalid message ID format.'),
  emoji: z.string().min(1, 'Emoji cannot be empty.'),
});

export const toggleReaction = trpcBaseProcedure
  .input(toggleReactionInputSchema)
  .use(databaseTransactionWrapper)
  .mutation(async ({ input, ctx }) => {
    const { user, prisma } = ctx;
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

    // 3. Permission checks: Guests can react only if EMOJI_REACTIONS capability is enabled
    if (
      membership.chatPermission === ChatMembershipPermission.GUEST &&
      !chat.capabilities.includes(ChatCapability.EMOJI_REACTIONS)
    ) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Emoji reactions are not enabled for guests in this chat.',
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

    await (existingReaction
      ? prisma.messageReaction.delete({
          where: {
            uuid: existingReaction.uuid,
          },
        })
      : prisma.messageReaction.create({
          data: {
            messageId,
            userId: user.uuid,
            emoji,
          },
        }));

    // 5. Publish real-time event to all subscribers via SSE
    const content = message.contentVersions[0]?.payload ?? {};
    await chatPubSub
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
        console.error('Failed to publish message_updated event:', error);
      });

    return { success: true };
  });
