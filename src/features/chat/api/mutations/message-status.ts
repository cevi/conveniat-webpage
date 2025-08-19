import { createMessageEvent } from '@/features/chat/api/database-interactions/create-message-event';
import { MessageEventType } from '@/lib/prisma';
import { trpcBaseProcedure } from '@/trpc/init';
import { z } from 'zod';

const changeMessageStatusSchema = z.object({
  messageId: z.string(),
  status: z.nativeEnum(MessageEventType),
});

export const messageStatus = trpcBaseProcedure
  .input(changeMessageStatusSchema)
  .mutation(async ({ input, ctx }) => {
    const { user, prisma } = ctx;
    const { messageId, status } = input;

    // Update the message event in the database
    await createMessageEvent(messageId, status, user, prisma);
  });
