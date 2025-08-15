import { trpcBaseProcedure } from '@/trpc/init';
import { z } from 'zod';

export const userProcedure = trpcBaseProcedure
  .input(z.object({})) // no input needed for this query
  .query(async ({ ctx }) => {
    const { user, prisma } = ctx;

    const prismaUser = await prisma.user.findUniqueOrThrow({
      where: { uuid: user.uuid },
    });

    return prismaUser.uuid;
  });
