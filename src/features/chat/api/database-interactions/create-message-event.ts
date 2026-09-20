import type { MessageEventType } from '@/lib/prisma/client';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import type { PrismaClientOrTransaction } from '@/types/types';
import { createLogger } from '@/utils/server-logger';
import { TRPCError } from '@trpc/server';

const logger = createLogger('chat:messages');

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
        type: eventType,
        userId: user.uuid,
      },
    })
    .catch((error: unknown) => {
      logger.error('Failed to record a message event', {
        error,
        'message.id': messageId,
        'message.event.type': eventType,
        'user.id': user.uuid,
      });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update message status',
      });
    });
};
