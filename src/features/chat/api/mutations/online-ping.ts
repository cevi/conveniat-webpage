import { trpcBaseProcedure } from '@/trpc/init';
import z from 'zod';

const onlinePingSchema = z.object({});

export const onlinePing = trpcBaseProcedure
  .input(onlinePingSchema) // no input needed for this mutation
  .mutation(async ({ ctx }) => {
    const { user, prisma } = ctx;
    await prisma.user.update({
      where: { uuid: user.uuid },
      data: {
        lastSeen: new Date(),
      },
    });
  });
