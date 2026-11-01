import {
  findOwnChatMembership,
  updateOwnChatMembership,
} from '@/features/chat/api/database-interactions/update-own-chat-membership';
import { ChatType } from '@/lib/prisma';
import { trpcBaseProcedure } from '@/trpc/init';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

/**
 * Mutes a chat for the caller, or unmutes it: a muted chat sends them no push, see
 * `sendNotification`. An emergency chat cannot be muted, its pushes have to wake people up.
 */
export const muteChat = trpcBaseProcedure
  .input(z.object({ chatId: z.uuid(), muted: z.boolean() }))
  .mutation(async ({ input, ctx }): Promise<{ success: true }> => {
    const { user, prisma } = ctx;
    const membership = await findOwnChatMembership(prisma, user.uuid, input.chatId);

    if (input.muted && membership.chat.type === ChatType.EMERGENCY) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'An emergency chat cannot be muted.' });
    }

    if (input.muted === (membership.mutedAt !== null)) return { success: true };

    await updateOwnChatMembership(prisma, user.uuid, input.chatId, {
      // eslint-disable-next-line unicorn/no-null
      mutedAt: input.muted ? new Date() : null,
    });
    return { success: true };
  });
