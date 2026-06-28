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
  let isOutsideTrackingPeriod = false;

  if (globalData.startDate) {
    const startDate = new Date(globalData.startDate);
    if (now < startDate) {
      isOutsideTrackingPeriod = true;
    }
  }

  if (globalData.endDate) {
    const endDate = new Date(globalData.endDate);
    if (now > endDate) {
      isOutsideTrackingPeriod = true;
      await prisma.user.updateMany({
        where: { presentAtCamp: true },
        data: { presentAtCamp: false },
      });
      await payload.update({
        collection: 'users',
        where: {
          presentAtCamp: {
            equals: true,
          },
        },
        data: {
          presentAtCamp: false,
        },
      });
    }
  }

  const startDateString = globalData.startDate ? String(globalData.startDate) : undefined;
  const endDateString = globalData.endDate ? String(globalData.endDate) : undefined;

  if (isOutsideTrackingPeriod) {
    return {
      isPresent: false,
      isOutsideTrackingPeriod: true,
      startDate: startDateString,
      endDate: endDateString,
    };
  }

  const prismaUser = await prisma.user.findUnique({
    where: { uuid: user.uuid },
    select: { presentAtCamp: true },
  });

  return {
    isPresent: prismaUser?.presentAtCamp ?? false,
    isOutsideTrackingPeriod: false,
    startDate: startDateString,
    endDate: endDateString,
  };
});
