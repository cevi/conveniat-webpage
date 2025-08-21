import type { PrismaClientOrTransaction } from '@/types/types';

export const findChatWithMembers = async (
  requestedMemberUuids: string[],
  prisma: PrismaClientOrTransaction,
  includeArchived: boolean = false,
): Promise<
  | ({
      chatMemberships: {
        user: {
          uuid: string;
        };
      }[];
    } & {
      name: string;
      uuid: string;
      lastUpdate: Date;
      createdAt: Date;
      archivedAt: Date | null;
    })
  | null
> => {
  return await prisma.chat.findFirst({
    where: {
      // Ensure all requested members are present
      chatMemberships: {
        every: { user: { uuid: { in: requestedMemberUuids } } },
        // Ensure no *other* members are present (i.e., only the requested members are there)
        none: { user: { uuid: { notIn: requestedMemberUuids } } },
      },
      ...(includeArchived
        ? {}
        : // eslint-disable-next-line unicorn/no-null
          { OR: [{ archivedAt: null }, { archivedAt: { gt: new Date() } }] }),
    },
    include: {
      chatMemberships: { select: { user: { select: { uuid: true } } } },
    },
  });
};
