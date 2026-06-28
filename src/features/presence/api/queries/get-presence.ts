import { trpcBaseProcedure } from '@/trpc/init';

export const getPresence = trpcBaseProcedure.query(async ({ ctx }) => {
  const { user, prisma } = ctx;

  const prismaUser = await prisma.user.findUnique({
    where: { uuid: user.uuid },
    select: { presentAtCamp: true },
  });

  return prismaUser?.presentAtCamp ?? false;
});
