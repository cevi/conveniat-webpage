import { isChatArchived } from '@/features/chat/api/permission-checks/is-chat-archived';
import { MessageEventType } from '@/lib/prisma/client';
import type { PrismaClientOrTransaction } from '@/types/types';
import { MessageType } from '@prisma/client';

export const markChatAsArchived = async (
  chat: { uuid: string; archivedAt: Date | null },
  prismaClient: PrismaClientOrTransaction,
): Promise<void> => {
  if (chat.uuid === '') {
    throw new Error('Chat UUID is required to archive a chat.');
  }

  if (isChatArchived(chat)) {
    console.warn(`Chat ${chat.uuid} is already archived.`);
    return; // no further action needed
  }

  await prismaClient.chat.update({
    where: { uuid: chat.uuid },
    data: { archivedAt: new Date() },
  });

  await prismaClient.message.create({
    data: {
      contentVersions: {
        create: [{ payload: 'This chat has been archived by the owner or an admin.' }],
      },
      type: MessageType.SYSTEM_MSG,
      chat: {
        connect: {
          uuid: chat.uuid,
        },
      },
      messageEvents: {
        create: [{ type: MessageEventType.STORED }],
      },
    },
  });
};
