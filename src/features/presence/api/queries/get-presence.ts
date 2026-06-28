import { trpcBaseProcedure } from '@/trpc/init';
import config from '@payload-config';
import { getPayload } from 'payload';

export const getPresence = trpcBaseProcedure.query(async ({ ctx }) => {
  const { user, prisma } = ctx;

  const payload = await getPayload({ config });
  const globalData = await payload.findGlobal({
    slug: 'campsite-presence',
  });

  const now = new Date();

  if (globalData.startDate) {
    const startDate = new Date(globalData.startDate);
    if (now < startDate) {
      return false;
    }
  }

  if (globalData.endDate) {
    const endDate = new Date(globalData.endDate);
    if (now > endDate) {
      await prisma.user.updateMany({
        where: { presentAtCamp: true },
        data: { presentAtCamp: false },
      });
      return false;
    }
  }

  const prismaUser = await prisma.user.findUnique({
    where: { uuid: user.uuid },
    select: { presentAtCamp: true },
  });

  return prismaUser?.presentAtCamp ?? false;
});
