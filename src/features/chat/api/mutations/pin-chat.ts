import {
  findOwnChatMembership,
  updateOwnChatMembership,
} from '@/features/chat/api/database-interactions/update-own-chat-membership';
import { trpcBaseProcedure } from '@/trpc/init';
import { z } from 'zod';

/**
 * Pins a chat to the top of the caller's own chat list, or unpins it. Nobody else sees it.
 * Pinning a pinned chat keeps its place, so a replayed call does not reorder the list.
 */
export const pinChat = trpcBaseProcedure
  .input(z.object({ chatId: z.string().uuid(), pinned: z.boolean() }))
  .mutation(async ({ input, ctx }): Promise<{ success: true }> => {
    const { user, prisma } = ctx;
    const membership = await findOwnChatMembership(prisma, user.uuid, input.chatId);

    if (input.pinned === (membership.pinnedAt !== null)) return { success: true };

    await updateOwnChatMembership(prisma, user.uuid, input.chatId, {
      // eslint-disable-next-line unicorn/no-null
      pinnedAt: input.pinned ? new Date() : null,
    });
    return { success: true };
  });
