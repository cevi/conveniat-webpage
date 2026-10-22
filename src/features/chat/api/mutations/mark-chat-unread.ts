import {
  findOwnChatMembership,
  updateOwnChatMembership,
} from '@/features/chat/api/database-interactions/update-own-chat-membership';
import { trpcBaseProcedure } from '@/trpc/init';
import { z } from 'zod';

/**
 * Marks a chat as unread for the caller, or takes the mark away. The mark leaves the read
 * receipts alone and goes away once the chat is read again, see `markChatAsRead`.
 */
export const markChatUnread = trpcBaseProcedure
  .input(z.object({ chatId: z.string().uuid(), unread: z.boolean() }))
  .mutation(async ({ input, ctx }): Promise<{ success: true }> => {
    const { user, prisma } = ctx;
    const membership = await findOwnChatMembership(prisma, user.uuid, input.chatId);

    if (input.unread === membership.markedUnread) return { success: true };

    await updateOwnChatMembership(prisma, user.uuid, input.chatId, {
      markedUnread: input.unread,
    });
    return { success: true };
  });
