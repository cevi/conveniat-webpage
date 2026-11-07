/**
 * @jest-environment jsdom
 */

import type { ChatMessage } from '@/features/chat/api/types';
import {
  findLatestMessageToRead,
  useMessageReadStatus,
} from '@/features/chat/hooks/use-message-read-status';
import { SYSTEM_SENDER_ID } from '@/lib/chat-shared';
import { MessageType } from '@/lib/prisma/enums';
import type { TestTrpc } from '@/trpc/test-trpc';
import { createTestTrpc } from '@/trpc/test-trpc';
import { onlineManager } from '@tanstack/react-query';
import type { RenderHookResult } from '@testing-library/react';
import { act, renderHook } from '@testing-library/react';

// the generated prisma client cannot be loaded under jsdom; the hook only needs its enums

jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);

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

/** lets the mutations started by the last render reach the server */
const settle = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('useMessageReadStatus', () => {
  let visibilityState: DocumentVisibilityState = 'visible';
  let testTrpc: TestTrpc;
  const markChatAsRead = jest.fn();
  const markChatUnread = jest.fn();

  const cacheChats = (chats: { id: string; isMarkedUnread?: boolean }[]): void => {
    testTrpc.queryClient.setQueryData(testTrpc.trpc.chat.chats.queryKey({}), chats as never);
  };

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
    markChatAsRead.mockReset();
    markChatUnread.mockReset();
    testTrpc = createTestTrpc({
      'chat.markChatAsRead': markChatAsRead,
      'chat.markChatUnread': markChatUnread,
    });
    visibilityState = 'visible';
  });

  afterEach(() => {
    jest.useRealTimers();
    onlineManager.setOnline(true);
  });

  interface Properties {
    sortedMessages: ChatMessage[];
    isAtBottom: boolean;
  }

  const render = (chatId: string, initial: Properties): RenderHookResult<void, Properties> =>
    renderHook(
      ({ sortedMessages, isAtBottom }) =>
        useMessageReadStatus({ chatId, currentUser: CURRENT_USER, sortedMessages, isAtBottom }),
      { initialProps: initial, wrapper: testTrpc.wrapper },
    );

  it('marks the newest message read when the chat is opened', async () => {
    render('chat-open', { sortedMessages: [message('msg-1')], isAtBottom: true });

    await settle();
    expect(markChatAsRead).toHaveBeenCalledWith({
      chatId: 'chat-open',
      lastMessageId: 'msg-1',
    });
  });

  it('waits until the app is back in the foreground', async () => {
    visibilityState = 'hidden';
    render('chat-hidden', { sortedMessages: [message('msg-1')], isAtBottom: true });
    await settle();
    expect(markChatAsRead).not.toHaveBeenCalled();

    setVisibility('visible');

    await settle();
    expect(markChatAsRead).toHaveBeenCalledWith({
      chatId: 'chat-hidden',
      lastMessageId: 'msg-1',
    });
  });

  it('waits until the reader scrolls back down to the newest message', async () => {
    const { rerender } = render('chat-scrolled', {
      sortedMessages: [message('msg-1'), message('msg-2')],
      isAtBottom: false,
    });
    await settle();
    expect(markChatAsRead).not.toHaveBeenCalled();

    rerender({ sortedMessages: [message('msg-1'), message('msg-2')], isAtBottom: true });

    await settle();
    expect(markChatAsRead).toHaveBeenCalledWith({
      chatId: 'chat-scrolled',
      lastMessageId: 'msg-2',
    });
  });

  it('marks a burst of messages read once', async () => {
    const { rerender } = render('chat-burst', {
      sortedMessages: [message('msg-1')],
      isAtBottom: true,
    });
    await settle();
    expect(markChatAsRead).toHaveBeenCalledTimes(1);

    rerender({ sortedMessages: [message('msg-1'), message('msg-2')], isAtBottom: true });
    rerender({
      sortedMessages: [message('msg-1'), message('msg-2'), message('msg-3')],
      isAtBottom: true,
    });
    await settle();
    expect(markChatAsRead).toHaveBeenCalledTimes(1);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });

    await settle();
    expect(markChatAsRead).toHaveBeenCalledTimes(2);
    expect(markChatAsRead).toHaveBeenLastCalledWith({
      chatId: 'chat-burst',
      lastMessageId: 'msg-3',
    });
  });

  it('takes back "Als ungelesen markieren" when the chat is opened, even with nothing new to read', async () => {
    cacheChats([{ id: 'chat-marked', isMarkedUnread: true }]);
    // the reader's own message is the newest: no read receipt goes out
    render('chat-marked', {
      sortedMessages: [message('msg-1', { senderId: CURRENT_USER })],
      isAtBottom: true,
    });

    await settle();
    expect(markChatAsRead).not.toHaveBeenCalled();
    expect(markChatUnread).toHaveBeenCalledWith({ chatId: 'chat-marked', unread: false });
    expect(testTrpc.queryClient.getQueryData(testTrpc.trpc.chat.chats.queryKey({}))).toEqual([
      expect.objectContaining({ id: 'chat-marked', isMarkedUnread: false }),
    ]);
  });

  it('leaves a chat that is not marked unread alone', async () => {
    cacheChats([{ id: 'chat-plain', isMarkedUnread: false }]);
    render('chat-plain', { sortedMessages: [message('msg-1')], isAtBottom: true });

    await settle();
    expect(markChatUnread).not.toHaveBeenCalled();
  });

  it('sends a receipt for a chat read offline once the connection is back', async () => {
    onlineManager.setOnline(false);
    render('chat-offline', { sortedMessages: [message('msg-1')], isAtBottom: true });

    await settle();
    expect(markChatAsRead).not.toHaveBeenCalled();

    act(() => onlineManager.setOnline(true));
    await settle();
    expect(markChatAsRead).toHaveBeenCalledWith({
      chatId: 'chat-offline',
      lastMessageId: 'msg-1',
    });
  });
});
