import { isChatArchived } from '@/features/chat/api/permission-checks/is-chat-archived';
import type { PrismaClient } from '@/lib/prisma';
import { MessageType } from '@prisma/client';

export const markChatAsArchived = async (
  chat: { uuid: string; isArchived: boolean },
  prismaClient: Partial<PrismaClient>,
): Promise<void> => {
  if (chat.uuid === '') {
    throw new Error('Chat UUID is required to archive a chat.');
  }

  if (!('chat' in prismaClient) || typeof prismaClient.chat.update !== 'function') {
    throw new Error('Invalid Prisma client provided.');
  }

  if (isChatArchived(chat)) {
    console.warn(`Chat ${chat.uuid} is already archived.`);
    return; // no further action needed
  }

  await prismaClient.chat.update({
    where: {
      uuid: chat.uuid,
    },
    data: {
      isArchived: true,
    },
  });

  if (!('message' in prismaClient) || typeof prismaClient.message.create !== 'function') {
    throw new Error('Invalid Prisma client provided for message creation.');
  }

  await prismaClient.message.create({
    data: {
      content: 'This chat has been archived by the owner or an admin.',
      type: MessageType.SYSTEM,
      chat: {
        connect: {
          uuid: chat.uuid,
        },
      },
      messageEvents: {
        create: {
          eventType: 'CREATED',
        },
      },
    },
  });
};
