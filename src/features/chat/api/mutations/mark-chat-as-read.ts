import { LARGE_CHAT_THRESHOLD } from '@/lib/chat-shared';
import { trpcBaseProcedure } from '@/trpc/init';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

const markChatAsReadInputSchema = z.object({
  chatId: z.string().uuid(),
  lastMessageId: z.string().uuid(),
});

export const markChatAsRead = trpcBaseProcedure
  .input(markChatAsReadInputSchema)
  .mutation(async ({ input, ctx }) => {
    const { user, prisma } = ctx;
    const { chatId, lastMessageId } = input;

    // 1. Verify that the message exists and belongs to the specified chat
    const message = await prisma.message.findFirst({
      where: {
        uuid: lastMessageId,
        chatId: chatId,
      },
      select: { uuid: true },
    });

    if (!message) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Message does not exist in the specified chat.',
      });
    }

    // 2. Retrieve current chat membership to check current lastReadMessageId and enforce permissions
    const membership = await prisma.chatMembership.findUnique({
      where: {
        userId_chatId: {
          userId: user.uuid,
          chatId: chatId,
        },
      },
      select: {
        lastReadMessageId: true,
      },
    });

    if (!membership) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'You are not a member of this chat.',
      });
    }

    // 3. Update the high-water mark only if the watermark advances (lexicographically greater for UUIDv7)
    const currentLastRead = membership.lastReadMessageId;
    if (!currentLastRead || lastMessageId > currentLastRead) {
      await prisma.chatMembership.update({
        where: {
          userId_chatId: {
            userId: user.uuid,
            chatId: chatId,
          },
        },
        data: {
          lastReadMessageId: lastMessageId,
        },
      });
    }

    // 4. Backward compatibility: Create a READ event only for small chats (< LARGE_CHAT_THRESHOLD)
    const chat = await prisma.chat.findUnique({
      where: { uuid: chatId },
      select: {
        chatMemberships: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (chat && chat.chatMemberships.length < LARGE_CHAT_THRESHOLD) {
      await prisma.messageEvent
        .create({
          data: {
            messageId: lastMessageId,
            userId: user.uuid,
            type: 'READ',
          },
        })
        .catch((error: unknown) => {
          // Ignore if already exists, log other issues
          console.warn('Could not create READ message event (might already exist):', error);
        });
    }
  });
