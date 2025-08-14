import type { PrismaClient } from '@/lib/prisma';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';

export const markChatAsDeletedForUser = async (
  chat: { uuid: string },
  user: HitobitoNextAuthUser,
  prismaClient: Partial<PrismaClient>,
): Promise<void> => {
  if (user.uuid === '' || chat.uuid === '') {
    throw new Error('Chat ID and User ID are required to mark a chat as deleted.');
  }

  if (
    !('chatMembership' in prismaClient) ||
    typeof prismaClient.chatMembership.update !== 'function'
  ) {
    throw new Error('Invalid Prisma client provided.');
  }

  await prismaClient.chatMembership.update({
    where: {
      userId_chatId: {
        chatId: chat.uuid,
        userId: user.uuid,
      },
    },
    data: {
      hasDeleted: true,
    },
  });
};
