import type { MessageEventType } from '@/lib/prisma/client';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import type { PrismaClientOrTransaction } from '@/types/types';
import { TRPCError } from '@trpc/server';

export const createMessageEvent = async (
  messageId: string,
  eventType: MessageEventType,
  user: HitobitoNextAuthUser,
  prisma: PrismaClientOrTransaction,
): Promise<void> => {
  await prisma.messageEvent
    .create({
      data: {
        messageId: messageId,
        eventType: eventType,
        userId: user.uuid,
      },
    })
    .catch((error: unknown) => {
      console.error('Error updating message status:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update message status',
      });
    });
};
