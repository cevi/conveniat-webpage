import { trpcBaseProcedure } from '@/trpc/init';
import config from '@payload-config';
import { getPayload } from 'payload';
import { z } from 'zod';

export const listPresentUsers = trpcBaseProcedure
  .input(
    z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
      search: z.string().optional(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const { prisma } = ctx;
    const { page, limit, search } = input;

    const payload = await getPayload({ config });
    const globalData = await payload.findGlobal({
      slug: 'campsite-presence',
    });

    const now = new Date();

    if (globalData.endDate) {
      const endDate = new Date(globalData.endDate);
      if (now > endDate) {
        await prisma.user.updateMany({
          where: { presentAtCamp: true },
          data: { presentAtCamp: false },
        });
        return {
          users: [],
          totalCount: 0,
          pageCount: 0,
        };
      }
    }

    const skip = (page - 1) * limit;

    const whereClause: {
      presentAtCamp: boolean;
      name?: {
        contains: string;
        mode: 'insensitive';
      };
    } = {
      presentAtCamp: true,
    };

    if (search && search.trim() !== '') {
      whereClause.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
        select: {
          uuid: true,
          name: true,
        },
      }),
      prisma.user.count({
        where: whereClause,
      }),
    ]);

    const pageCount = Math.ceil(totalCount / limit);

    return {
      users,
      totalCount,
      pageCount,
    };
  });
