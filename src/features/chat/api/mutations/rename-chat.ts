import { trpcBaseProcedure } from '@/trpc/init';
import { z } from 'zod';

const renameChatMutationSchema = z.object({
  chatUuid: z.string(),
  newName: z.string().min(1, 'Chat name cannot be empty'),
});

export const renameChat = trpcBaseProcedure
  .input(renameChatMutationSchema)
  .mutation(async ({ input, ctx }) => {
    const { prisma } = ctx;
    const { chatUuid, newName } = input;

    await prisma.chat.update({
      where: {
        uuid: chatUuid,
      },
      data: {
        name: newName,
      },
    });
  });
