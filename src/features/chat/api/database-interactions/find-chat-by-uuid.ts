import type { ChatMembershipPermission } from '@/lib/prisma/client';
import type { PrismaClientOrTransaction } from '@/types/types';

export const findChatByUuid = async (
  chatId: string,
  prismaClient: PrismaClientOrTransaction,
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

  return prismaClient.chat.findUniqueOrThrow({
    where: {
      uuid: chatId,
    },
    include: {
      chatMemberships: true,
    },
  });
};
