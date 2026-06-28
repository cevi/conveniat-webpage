import { trpcBaseProcedure } from '@/trpc/init';
import { z } from 'zod';

export const updatePresence = trpcBaseProcedure
  .input(
    z.object({
      presentAtCamp: z.boolean(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const { user, prisma } = ctx;

    const updatedUser = await prisma.user.update({
      where: { uuid: user.uuid },
      data: {
        presentAtCamp: input.presentAtCamp,
      },
    });

    return {
      success: true,
      presentAtCamp: updatedUser.presentAtCamp,
    };
  });
