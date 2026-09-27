import type { ChatMessage } from '@/features/chat/api/types';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { applyMessageToChatList } from '@/features/chat/utils/apply-message-to-chat-list';

const ME = 'user-me';
const OTHER = 'user-other';

const chat = (
  id: string,
  overrides: Partial<ChatWithMessagePreview> = {},
): ChatWithMessagePreview => ({
  id,
  name: `Chat ${id}`,
  status: 'OPEN',
  chatType: 'GROUP',
  lastUpdate: new Date('2027-07-24T08:00:00Z'),
  unreadCount: 0,
  messageCount: 3,
  userChatPermission: 'MEMBER',
  lastMessage: {
    id: `last-${id}`,
    senderId: OTHER,
    messagePreview: 'Morgen um acht auf dem Platz',
    createdAt: new Date('2027-07-24T08:00:00Z'),
    status: 'STORED',
  },
  ...overrides,
});

const message = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'message-new',
  createdAt: new Date('2027-07-24T09:00:00Z'),
  messagePayload: { text: 'Znacht gibt es um sechs' },
  senderId: OTHER,
  status: 'STORED',
  type: 'TEXT_MSG',
  ...overrides,
});

describe('applyMessageToChatList', () => {
  it('moves the chat to the top with the message as its preview and one more unread', () => {
    const chats = [chat('a'), chat('b', { unreadCount: 2 })];

    const patched = applyMessageToChatList(chats, 'b', message(), ME);

    expect(patched?.map((c) => c.id)).toEqual(['b', 'a']);
    expect(patched?.[0]).toMatchObject({
      unreadCount: 3,
      messageCount: 4,
      lastUpdate: new Date('2027-07-24T09:00:00Z'),
      lastMessage: { id: 'message-new', messagePreview: 'Znacht gibt es um sechs' },
    });
  });

  it('does not count the own message from another device as unread', () => {
    const patched = applyMessageToChatList([chat('a')], 'a', message({ senderId: ME }), ME);

    expect(patched?.[0]?.unreadCount).toBe(0);
    expect(patched?.[0]?.lastMessage?.id).toBe('message-new');
  });

  it('counts a system message as unread even when it names the user as sender', () => {
    const patched = applyMessageToChatList(
      [chat('a')],
      'a',
      message({ senderId: ME, type: 'SYSTEM_MSG' }),
      ME,
    );

    expect(patched?.[0]?.unreadCount).toBe(1);
  });

  it('keeps the unread count of a large chat at 1, like the server', () => {
    const patched = applyMessageToChatList(
      [chat('a', { isLarge: true, unreadCount: 1 })],
      'a',
      message(),
      ME,
    );

    expect(patched?.[0]?.unreadCount).toBe(1);
  });

  it('applies a message only once, however many chat screens hear it', () => {
    const once = applyMessageToChatList([chat('a')], 'a', message(), ME) ?? [];
    const twice = applyMessageToChatList(once, 'a', message(), ME);

    expect(twice).toBe(once);
  });

  it('leaves a chat that is not in the list to a refetch', () => {
    expect(applyMessageToChatList([chat('a')], 'unknown', message(), ME)).toBeUndefined();
  });

  it('patches a list persisted before counts and large chats existed', () => {
    const persisted = chat('a');
    const old = { ...persisted, unreadCount: undefined, messageCount: undefined };

    const patched = applyMessageToChatList(
      [old as unknown as ChatWithMessagePreview],
      'a',
      message(),
      ME,
    );

    expect(patched?.[0]).toMatchObject({ unreadCount: 1, messageCount: 1 });
  });
});
