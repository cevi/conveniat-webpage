import { ChatMembershipPermission, ChatType } from '@/lib/prisma/client';
import type { PrismaClientOrTransaction } from '@/types/types';

/**
 * Who of `senderIds` is an owner or admin of a forum topic, its Kernteam, so their comments
 * carry the badge their posts carry. Empty for every other chat, without a query.
 */
export const findTopicAdminIds = async (
  prisma: PrismaClientOrTransaction,
  chat: { uuid: string; type: ChatType },
  senderIds: readonly (string | null | undefined)[],
): Promise<ReadonlySet<string>> => {
  if (chat.type !== ChatType.FORUM) return new Set();
  const ids = [...new Set(senderIds.filter((id): id is string => typeof id === 'string'))];
  if (ids.length === 0) return new Set();
  const admins = await prisma.chatMembership.findMany({
    where: {
      chatId: chat.uuid,
      userId: { in: ids },
      chatPermission: { in: [ChatMembershipPermission.OWNER, ChatMembershipPermission.ADMIN] },
    },
    select: { userId: true },
  });
  return new Set(admins.map((admin) => admin.userId));
};

/** Whether a membership is the Kernteam's of its topic, for a message written just now. */
export const isTopicAdminPermission = (permission: ChatMembershipPermission | undefined): boolean =>
  permission === ChatMembershipPermission.OWNER || permission === ChatMembershipPermission.ADMIN;
