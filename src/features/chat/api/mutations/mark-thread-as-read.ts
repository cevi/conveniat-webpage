import { trpcBaseProcedure } from '@/trpc/init';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

const markThreadAsReadInputSchema = z.object({
  chatId: z.string().uuid(),
  threadId: z.string().uuid(),
});

export const markThreadAsRead = trpcBaseProcedure
  .input(markThreadAsReadInputSchema)
  .mutation(async ({ input, ctx }) => {
    const { user, prisma } = ctx;
    const { chatId, threadId } = input;

    // 1. Verify that the parent message exists and belongs to the specified chat
    const parentMessage = await prisma.message.findFirst({
      where: {
        uuid: threadId,
        chatId: chatId,
      },
      select: { uuid: true },
    });

    if (!parentMessage) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Thread parent message does not exist in the specified chat.',
      });
    }

    // 2. Enforce chat membership
    const membership = await prisma.chatMembership.findUnique({
      where: {
        userId_chatId: {
          userId: user.uuid,
          chatId: chatId,
        },
      },
      select: { userId: true },
    });

    if (!membership) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'You are not a member of this chat.',
      });
    }

    // 3. Find all replies in this thread not sent by the current user
    // and that don't have a READ event for the current user
    const unreadReplies = await prisma.message.findMany({
      where: {
        chatId: chatId,
        parentId: threadId,
        senderId: { not: user.uuid },
        messageEvents: {
          none: {
            type: 'READ',
            userId: user.uuid,
          },
        },
      },
      select: { uuid: true },
    });

    if (unreadReplies.length === 0) {
      return { count: 0 };
    }

    // 4. Create READ events for these replies in parallel
    const promises = unreadReplies.map(async (reply) => {
      try {
        return await prisma.messageEvent.create({
          data: {
            messageId: reply.uuid,
            userId: user.uuid,
            type: 'READ',
          },
        });
      } catch (error: unknown) {
        // Ignore unique constraint violation
        console.warn(`Already read message ${reply.uuid}:`, error);
        return;
      }
    });

    const createdEvents = await Promise.all(promises);

    return { count: createdEvents.filter((event) => event !== undefined).length };
  });
