import { createMessageEvent } from '@/features/chat/api/database-interactions/create-message-event';
import { MessageStatusDto } from '@/features/chat/types/api-dto-types';
import { MessageEventType } from '@/lib/prisma';
import { trpcBaseProcedure } from '@/trpc/init';
import { z } from 'zod';

const changeMessageStatusSchema = z.object({
  messageId: z.string(),
  status: z.nativeEnum(MessageStatusDto),
});

export const messageStatus = trpcBaseProcedure
  .input(changeMessageStatusSchema)
  .mutation(async ({ input, ctx }) => {
    const { user, prisma } = ctx;
    const { messageId, status } = input;

    let eventType: MessageEventType = MessageEventType.USER_RECEIVED;
    if (status === MessageStatusDto.DELIVERED) {
      eventType = MessageEventType.USER_RECEIVED;
    } else if (status === MessageStatusDto.READ) {
      eventType = MessageEventType.USER_READ;
    }

    // Update the message event in the database
    await createMessageEvent(messageId, eventType, user, prisma);
  });
