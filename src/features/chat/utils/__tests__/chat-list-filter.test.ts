import { matchesChatListFilter } from '@/features/chat/utils/chat-list-filter';
import { ChatType } from '@/lib/prisma/client';

const privateRead = { chatType: ChatType.ONE_TO_ONE, unreadCount: 0 };
const privateUnread = { chatType: ChatType.ONE_TO_ONE, unreadCount: 2 };
const group = { chatType: ChatType.GROUP, unreadCount: 0 };
const announcements = { chatType: ChatType.ANNOUNCEMENT, unreadCount: 1 };

describe('matchesChatListFilter', () => {
  it('keeps every chat under "Alle"', () => {
    for (const chat of [privateRead, privateUnread, group, announcements]) {
      expect(matchesChatListFilter(chat, 'all')).toBe(true);
    }
  });

  it('keeps the chats with unread messages under "Ungelesen"', () => {
    expect(matchesChatListFilter(privateUnread, 'unread')).toBe(true);
    expect(matchesChatListFilter(announcements, 'unread')).toBe(true);
    expect(matchesChatListFilter(privateRead, 'unread')).toBe(false);
  });

  it('keeps groups, not private chats or channels, under "Gruppen"', () => {
    expect(matchesChatListFilter(group, 'groups')).toBe(true);
    expect(
      matchesChatListFilter({ chatType: ChatType.COURSE_GROUP, unreadCount: 0 }, 'groups'),
    ).toBe(true);
    expect(matchesChatListFilter(privateUnread, 'groups')).toBe(false);
    expect(matchesChatListFilter(announcements, 'groups')).toBe(false);
  });
});
