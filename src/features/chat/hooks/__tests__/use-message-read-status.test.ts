import type { ChatMessage } from '@/features/chat/api/types';
import { findLatestMessageToRead } from '@/features/chat/hooks/use-message-read-status';
import { SYSTEM_SENDER_ID } from '@/lib/chat-shared';
import { MessageType } from '@/lib/prisma';

jest.mock('@/trpc/client', () => ({ trpc: {} }));

const CURRENT_USER = 'user-uuid-1';

const message = (id: string, overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id,
  type: MessageType.TEXT_MSG,
  senderId: 'user-uuid-2',
  createdAt: new Date(),
  messagePayload: { text: id },
  status: 'STORED',
  ...overrides,
});

describe('findLatestMessageToRead', () => {
  it('picks the latest system message or message from someone else', () => {
    const messages = [
      message('msg-1', { type: MessageType.SYSTEM_MSG, senderId: undefined }),
      message('msg-2', { senderId: CURRENT_USER }),
      message('msg-3'),
      message('msg-4', { senderId: SYSTEM_SENDER_ID }),
      message('msg-5', { type: MessageType.SYSTEM_MSG, senderId: CURRENT_USER }),
      message('msg-6', { senderId: CURRENT_USER }),
    ];

    expect(findLatestMessageToRead(messages, CURRENT_USER)?.id).toBe('msg-5');
  });

  it('treats a message without a sender as someone else', () => {
    expect(
      findLatestMessageToRead([message('msg-1', { senderId: undefined })], CURRENT_USER)?.id,
    ).toBe('msg-1');
  });

  it('skips queued and failed bubbles, which the server has never stored', () => {
    const messages = [
      message('msg-1'),
      message('msg-2', { isPendingOffline: true, senderId: 'offline-user' }),
      message('msg-3', { sendFailed: true, senderId: undefined }),
    ];

    expect(findLatestMessageToRead(messages, CURRENT_USER)?.id).toBe('msg-1');
  });
});
