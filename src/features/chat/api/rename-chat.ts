'use server';

import prisma from '@/features/chat/database';

export const renameChat = async (
  chatId: string,
  newName: string,
): Promise<{
  success: boolean;
}> => {
  await prisma.chat.update({
    where: {
      uuid: chatId,
    },
    data: {
      name: newName,
    },
  });

  return { success: true };
};
