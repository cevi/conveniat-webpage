import type { PrismaClientOrTransaction } from '@/types/types';

export const findChatWithMembers = async (
  requestedMemberUuids: string[],
  prisma: PrismaClientOrTransaction,
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
    },
    include: {
      chatMemberships: { select: { user: { select: { uuid: true } } } },
    },
  });
};
