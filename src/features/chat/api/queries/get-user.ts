import { trpcBaseProcedure } from '@/trpc/init';
import { z } from 'zod';

export const getUser = trpcBaseProcedure
  .input(z.object({})) // no input needed for this query
  .query(async ({ ctx }) => {
    const { user, prisma } = ctx;

    const prismaUser = await prisma.user.findUniqueOrThrow({
      where: { uuid: user.uuid },
    });

    return prismaUser.uuid;
  });
