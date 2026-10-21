import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { ChatType } from '@/lib/prisma/client';

/** What the chips over the chat list show: every chat, the unread ones, or the groups. */
export type ChatListFilter = 'all' | 'unread' | 'groups';

/** Groups people set up themselves or that belong to a course; not channels or support. */
const GROUP_TYPES = new Set<ChatType>([ChatType.GROUP, ChatType.COURSE_GROUP]);

/**
 * Whether a chat belongs in the list under a filter chip.
 *
 * @param chat - a chat of the overview
 * @param filter - the chosen chip
 */
export const matchesChatListFilter = (
  chat: Pick<ChatWithMessagePreview, 'chatType' | 'unreadCount'>,
  filter: ChatListFilter,
): boolean => {
  if (filter === 'unread') return chat.unreadCount > 0;
  if (filter === 'groups') return GROUP_TYPES.has(chat.chatType);
  return true;
};
