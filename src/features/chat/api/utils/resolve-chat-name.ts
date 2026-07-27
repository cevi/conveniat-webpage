// Helper functions for resolving chat names and message statuses
import { ChatType } from '@/lib/prisma/client';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { formatUserFullName } from '@/utils/format-user-name';

export const resolveChatName = (
  chatName: string,
  users: {
    name: string;
    uuid: string;
    fullName?: string | undefined;
    nickname?: string | null | undefined;
  }[],
  currentUser: HitobitoNextAuthUser,
  chatType: ChatType,
): string => {
  if (chatType !== ChatType.ONE_TO_ONE) {
    return chatName;
  }

  const otherUser = users.find((user) => user.uuid !== currentUser.uuid.toString());
  if (otherUser) {
    if (typeof otherUser.fullName === 'string' && otherUser.fullName.trim().length > 0) {
      return formatUserFullName(otherUser.fullName, otherUser.nickname);
    }
    return otherUser.name;
  }

  // Fallback
  return chatName;
};
