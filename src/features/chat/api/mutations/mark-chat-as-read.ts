import { LARGE_CHAT_THRESHOLD } from '@/lib/chat-shared';
import { trpcBaseProcedure } from '@/trpc/init';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

const markChatAsReadInputSchema = z.object({
  chatId: z.uuid(),
  lastMessageId: z.uuid(),
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

    // 2. Advance the high-water mark in one statement, so concurrent calls cannot move it
    // backwards: it only moves when unset or when the stored message is not newer than this one
    // (a stored id pointing at a deleted message counts as unset). Reading the chat also takes
    // away the caller's own unread mark.
    const updatedRows = await prisma.$executeRaw`
      UPDATE "ChatMembership" AS membership
      SET "lastReadMessageId" = ${lastMessageId}, "markedUnread" = false
      WHERE membership."userId" = ${user.uuid}
        AND membership."chatId" = ${chatId}
        AND NOT EXISTS (
          SELECT 1 FROM "Message" AS current
          WHERE current."uuid" = membership."lastReadMessageId"
            AND current."createdAt" > (SELECT "createdAt" FROM "Message" WHERE "uuid" = ${lastMessageId})
        )
    `;

    if (updatedRows === 0) {
      const membership = await prisma.chatMembership.findUnique({
        where: { userId_chatId: { userId: user.uuid, chatId: chatId } },
        select: { markedUnread: true },
      });

      if (!membership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'You are not a member of this chat.',
        });
      }

      // The mark goes away as well when an older message is read, which does not move the
      // high-water mark.
      if (membership.markedUnread) {
        await prisma.chatMembership.update({
          where: { userId_chatId: { userId: user.uuid, chatId: chatId } },
          data: { markedUnread: false },
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
