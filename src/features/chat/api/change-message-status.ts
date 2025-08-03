'use server';

import prisma from '@/features/chat/database';
import type { ChangeMessageStatus } from '@/features/chat/types/api-dto-types';
import { MessageStatusDto } from '@/features/chat/types/api-dto-types';
import { MessageEventType } from '@/lib/prisma';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { auth } from '@/utils/auth-helpers';

export const changeMessageStatus = async (message: ChangeMessageStatus): Promise<void> => {
  const session = await auth();
  const user = session?.user as unknown as HitobitoNextAuthUser | undefined;
  if (user === undefined) {
    throw new Error('User not authenticated');
  }

  let eventType: MessageEventType = MessageEventType.USER_RECEIVED;

  if (message.status === MessageStatusDto.DELIVERED) {
    eventType = MessageEventType.USER_RECEIVED;
  } else if (message.status === MessageStatusDto.READ) {
    eventType = MessageEventType.USER_READ;
  }

  // Update the message event in the database
  await prisma.messageEvent
    .create({
      data: {
        messageId: message.messageId,
        eventType: eventType,
        userId: user.uuid,
      },
    })
    .catch(() => ({}));
};
