/**
 * @jest-environment jsdom
 */

import type { ChatMessage } from '@/features/chat/api/types';
import {
  findLatestMessageToRead,
  useMessageReadStatus,
} from '@/features/chat/hooks/use-message-read-status';
import { SYSTEM_SENDER_ID } from '@/lib/chat-shared';
import { MessageType } from '@/lib/prisma';
import type { RenderHookResult } from '@testing-library/react';
import { act, renderHook } from '@testing-library/react';

// the generated prisma client cannot be loaded under jsdom; the hook only needs its enums
jest.mock('@/lib/prisma', () => ({
  MessageType: { TEXT_MSG: 'TEXT_MSG', SYSTEM_MSG: 'SYSTEM_MSG' },
}));

const mockMarkChatAsRead = jest.fn();

jest.mock('@/trpc/client', () => ({
  trpc: {
    useUtils: (): unknown => ({ chat: { chats: { setData: jest.fn(), invalidate: jest.fn() } } }),
    chat: { markChatAsRead: { useMutation: (): unknown => ({ mutate: mockMarkChatAsRead }) } },
  },
}));

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

describe('useMessageReadStatus', () => {
  let visibilityState: DocumentVisibilityState = 'visible';

  const setVisibility = (state: DocumentVisibilityState): void => {
    visibilityState = state;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
  };

  beforeAll(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibilityState,
    });
  });

  beforeEach(() => {
    jest.useFakeTimers();
    mockMarkChatAsRead.mockClear();
    visibilityState = 'visible';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  interface Properties {
    sortedMessages: ChatMessage[];
    isAtBottom: boolean;
  }

  const render = (chatId: string, initial: Properties): RenderHookResult<void, Properties> =>
    renderHook(
      ({ sortedMessages, isAtBottom }) =>
        useMessageReadStatus({ chatId, currentUser: CURRENT_USER, sortedMessages, isAtBottom }),
      { initialProps: initial },
    );

  it('marks the newest message read when the chat is opened', () => {
    render('chat-open', { sortedMessages: [message('msg-1')], isAtBottom: true });

    expect(mockMarkChatAsRead).toHaveBeenCalledWith({
      chatId: 'chat-open',
      lastMessageId: 'msg-1',
    });
  });

  it('waits until the app is back in the foreground', () => {
    visibilityState = 'hidden';
    render('chat-hidden', { sortedMessages: [message('msg-1')], isAtBottom: true });
    expect(mockMarkChatAsRead).not.toHaveBeenCalled();

    setVisibility('visible');

    expect(mockMarkChatAsRead).toHaveBeenCalledWith({
      chatId: 'chat-hidden',
      lastMessageId: 'msg-1',
    });
  });

  it('waits until the reader scrolls back down to the newest message', () => {
    const { rerender } = render('chat-scrolled', {
      sortedMessages: [message('msg-1'), message('msg-2')],
      isAtBottom: false,
    });
    expect(mockMarkChatAsRead).not.toHaveBeenCalled();

    rerender({ sortedMessages: [message('msg-1'), message('msg-2')], isAtBottom: true });

    expect(mockMarkChatAsRead).toHaveBeenCalledWith({
      chatId: 'chat-scrolled',
      lastMessageId: 'msg-2',
    });
  });

  it('marks a burst of messages read once', () => {
    const { rerender } = render('chat-burst', {
      sortedMessages: [message('msg-1')],
      isAtBottom: true,
    });
    expect(mockMarkChatAsRead).toHaveBeenCalledTimes(1);

    rerender({ sortedMessages: [message('msg-1'), message('msg-2')], isAtBottom: true });
    rerender({
      sortedMessages: [message('msg-1'), message('msg-2'), message('msg-3')],
      isAtBottom: true,
    });
    expect(mockMarkChatAsRead).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(mockMarkChatAsRead).toHaveBeenCalledTimes(2);
    expect(mockMarkChatAsRead).toHaveBeenLastCalledWith({
      chatId: 'chat-burst',
      lastMessageId: 'msg-3',
    });
  });
});
