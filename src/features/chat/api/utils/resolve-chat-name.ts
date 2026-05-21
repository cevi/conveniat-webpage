// Helper functions for resolving chat names and message statuses
import { ChatType } from '@/lib/prisma/client';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';

export const resolveChatName = (
  chatName: string,
  users: { name: string; uuid: string }[],
  currentUser: HitobitoNextAuthUser,
  chatType: ChatType,
): string => {
  if (chatType !== ChatType.ONE_TO_ONE) {
    return chatName;
  }

  const otherUser = users.find((user) => user.uuid !== currentUser.uuid.toString());
  if (otherUser) {
    return otherUser.name;
  }

  // Fallback
  return chatName;
};
