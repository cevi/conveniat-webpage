import type { PrismaClient } from '@/lib/prisma';
import type { ChatMembershipPermission } from '@/lib/prisma/client';

export const findChatByUuid = async (
  chatId: string,
  prismaClient: Partial<PrismaClient>,
): Promise<
  {
    chatMemberships: {
      userId: string;
      chatId: string;
      hasDeleted: boolean;
      chatPermission: ChatMembershipPermission;
    }[];
  } & { uuid: string; name: string; lastUpdate: Date; createdAt: Date; isArchived: boolean }
> => {
  if (chatId === '') {
    throw new Error('Chat ID is required to find a chat.');
  }

  if (!('chat' in prismaClient) || typeof prismaClient.chat.findUnique !== 'function') {
    throw new Error('Invalid Prisma client provided.');
  }

  return prismaClient.chat.findUniqueOrThrow({
    where: {
      uuid: chatId,
    },
    include: {
      chatMemberships: true,
    },
  });
};
