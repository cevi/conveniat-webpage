import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import type { PrismaClientOrTransaction } from '@/types/types';

export const markChatAsDeletedForUser = async (
  chat: { uuid: string },
  user: HitobitoNextAuthUser,
  prismaClient: PrismaClientOrTransaction,
): Promise<void> => {
  if (user.uuid === '' || chat.uuid === '') {
    throw new Error('Chat ID and User ID are required to mark a chat as deleted.');
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
