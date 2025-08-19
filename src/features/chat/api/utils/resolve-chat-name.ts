// Helper functions for resolving chat names and message statuses
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';

export const resolveChatName = (
  chatName: string,
  users: { name: string; uuid: string }[],
  currentUser: HitobitoNextAuthUser,
): string => {
  if (users.length > 2) {
    return chatName;
  }

  const otherUser = users.find((user) => user.uuid !== currentUser.uuid.toString());
  if (otherUser) {
    return otherUser.name;
  }

  // Fallback
  return chatName;
};
