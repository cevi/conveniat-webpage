import { ChatType } from '@/lib/prisma/client';
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
      // A group, support or course chat can have the same two members, and a message meant
      // for the private chat must not land there.
      type: ChatType.ONE_TO_ONE,
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
