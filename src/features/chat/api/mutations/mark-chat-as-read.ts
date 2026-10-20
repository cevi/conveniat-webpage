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
      select: { seq: true },
    });

    if (!message) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Message does not exist in the specified chat.',
      });
    }

    // 2. Advance the read marker to the position of this message. The condition is part of the
    // UPDATE, so concurrent calls cannot move it backwards.
    const { count: updatedRows } = await prisma.chatMembership.updateMany({
      where: {
        userId: user.uuid,
        chatId,
        // eslint-disable-next-line unicorn/no-null -- Prisma matches a SQL NULL only through null
        OR: [{ lastReadSeq: null }, { lastReadSeq: { lt: message.seq } }],
      },
      data: { lastReadSeq: message.seq, lastReadMessageId: lastMessageId },
    });

    if (updatedRows === 0) {
      const membership = await prisma.chatMembership.findUnique({
        where: { userId_chatId: { userId: user.uuid, chatId: chatId } },
        select: { userId: true },
      });

      if (!membership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'You are not a member of this chat.',
        });
      }
    }

    // 3. Small chats also keep a READ event for the read ticks, large ones only the high-water
    // mark. Counting stops at the threshold: an announcement channel has thousands of members,
    // and each of them runs this when they open an announcement.
    const memberCount = await prisma.chatMembership.count({
      where: { chatId },
      take: LARGE_CHAT_THRESHOLD,
    });

    if (memberCount < LARGE_CHAT_THRESHOLD) {
      await prisma.messageEvent.createMany({
        data: [{ messageId: lastMessageId, userId: user.uuid, type: 'READ' }],
        skipDuplicates: true,
      });
    }
  });
