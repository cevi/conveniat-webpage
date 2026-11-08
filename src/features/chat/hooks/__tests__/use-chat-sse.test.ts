/**
 * @jest-environment jsdom
 */

import { CHAT_PAGE_SIZE } from '@/features/chat/constants';
import { useChatSSE } from '@/features/chat/hooks/use-chat-sse';
import type { TestTrpc } from '@/trpc/test-trpc';
import { createTestTrpc } from '@/trpc/test-trpc';
import type { QueryKey } from '@tanstack/react-query';
import { hashKey, useQuery } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

jest.mock('superjson', () => ({
  parse: (data: unknown): unknown => JSON.parse(data as string),
  stringify: (data: unknown): string => JSON.stringify(data),
}));

jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);

jest.mock('@/features/chat/utils/realtime-message-notification', () => ({
  notifyRealtimeChatMessage: jest.fn(),
}));

describe('useChatSSE', () => {
  let mockEventSourceConstructor: jest.Mock;
  const mockAddEventListener = jest.fn();
  const mockClose = jest.fn();
  let testTrpc: TestTrpc;

  const renderSSE = (chatIds: string[]): { unmount: () => void } =>
    renderHook(() => useChatSSE(chatIds), { wrapper: testTrpc.wrapper });

  /** the listener the open stream registered for `type` */
  const streamListener = (type: string): ((event: unknown) => void) | undefined =>
    (mockAddEventListener.mock.calls as [string, (event: unknown) => void][]).findLast(
      ([eventType]) => eventType === type,
    )?.[1];

  /** counts how often each cached query is invalidated from here on */
  const countInvalidations = (): ((queryKey: QueryKey) => number) => {
    const counts = new Map<string, number>();
    testTrpc.queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'invalidate') {
        counts.set(event.query.queryHash, (counts.get(event.query.queryHash) ?? 0) + 1);
      }
    });
    return (queryKey) => counts.get(hashKey(queryKey)) ?? 0;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockEventSourceConstructor = jest.fn().mockImplementation((url: string) => ({
      url,
      addEventListener: mockAddEventListener,
      removeEventListener: jest.fn(),
      close: mockClose,
    }));
    globalThis.EventSource = mockEventSourceConstructor as unknown as typeof EventSource;

    testTrpc = createTestTrpc();
    // signed in: `chat.user` never goes stale, so the seeded answer is all the hook reads
    testTrpc.queryClient.setQueryData(testTrpc.trpc.chat.user.queryKey({}), 'user-uuid-123');
  });

  afterEach(() => {
    // Flushes the coalescing timeout that tears the shared stream down, so the next
    // test starts without a subscription. `runAllTimers` cannot be used: the shared
    // engine keeps a heartbeat watchdog interval running while a stream is open.
    jest.advanceTimersByTime(1);
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('constructs correct EventSource URL with user channel and non-empty chat IDs', () => {
    const chatId = '550e8400-e29b-41d4-a716-446655440000';
    const { unmount } = renderSSE([chatId, '', '   ']);

    jest.advanceTimersByTime(1);

    expect(mockEventSourceConstructor).toHaveBeenCalledTimes(1);
    const calls = mockEventSourceConstructor.mock.calls as string[][];
    const calledUrl = calls[0]?.[0] ?? '';
    expect(calledUrl).toContain('/api/chat/sse?chatIds=');
    expect(calledUrl).toContain(chatId);
    expect(calledUrl).toContain('user-uuid-123');
    expect(calledUrl).not.toContain('chatIds=,');
    expect(calledUrl).not.toMatch(/chatIds=(,|$)/);

    unmount();
    jest.advanceTimersByTime(1);
  });

  it('connects to user channel when chatIds is empty array', () => {
    const { unmount } = renderSSE([]);

    jest.advanceTimersByTime(1);

    expect(mockEventSourceConstructor).toHaveBeenCalledTimes(1);
    const calls = mockEventSourceConstructor.mock.calls as string[][];
    const calledUrl = calls[0]?.[0] ?? '';
    // The reason depends on whether an earlier test already opened the shared stream.
    expect(calledUrl).toMatch(/^\/api\/chat\/sse\?chatIds=user-uuid-123&reason=\w+$/);

    unmount();
    jest.advanceTimersByTime(1);
  });

  it('does not open EventSource if currentUser is empty or undefined', () => {
    // signed out, or `chat.user` has not answered yet
    testTrpc = createTestTrpc({ 'chat.user': () => new Promise(() => {}) });

    const { unmount } = renderSSE(['550e8400-e29b-41d4-a716-446655440000']);

    jest.advanceTimersByTime(1);

    expect(mockEventSourceConstructor).not.toHaveBeenCalled();

    unmount();
    jest.advanceTimersByTime(1);
  });

  it('patches the chat list for a new message instead of refetching it', () => {
    const chatId = '550e8400-e29b-41d4-a716-446655440000';
    const otherChatId = '550e8400-e29b-41d4-a716-446655440001';
    const { trpc, queryClient } = testTrpc;
    const chatsKey = trpc.chat.chats.queryKey({});
    queryClient.setQueryData(chatsKey, [
      { id: otherChatId, unreadCount: 0, messageCount: 1 },
      { id: chatId, unreadCount: 0, messageCount: 1 },
    ] as never);
    const { unmount } = renderSSE([chatId]);
    jest.advanceTimersByTime(1);

    const onMessage = streamListener('message');
    onMessage?.({
      data: JSON.stringify({
        type: 'new_message',
        chatId,
        senderId: 'someone-else',
        message: {
          id: 'message-1',
          createdAt: '2027-07-24T09:00:00Z',
          messagePayload: { text: 'Znacht gibt es um sechs' },
          senderId: 'someone-else',
          status: 'STORED',
          type: 'TEXT_MSG',
        },
      }),
    });

    expect(queryClient.getQueryState(chatsKey)?.isInvalidated).toBe(false);
    expect(queryClient.getQueryData(chatsKey)).toEqual([
      expect.objectContaining({ id: chatId, unreadCount: 1 }),
      expect.objectContaining({ id: otherChatId, unreadCount: 0 }),
    ]);

    unmount();
    jest.advanceTimersByTime(1);
  });

  it('shows a message another member deleted as deleted, without refetching it', () => {
    const chatId = '550e8400-e29b-41d4-a716-446655440000';
    const { trpc, queryClient } = testTrpc;
    const chatsKey = trpc.chat.chats.queryKey({});
    queryClient.setQueryData(chatsKey, [
      {
        id: chatId,
        unreadCount: 0,
        lastMessage: { id: 'message-1', senderId: 'someone-else', messagePreview: 'Hoi' },
      },
    ] as never);
    const messagesKey = trpc.chat.infiniteMessages.infiniteQueryKey({
      chatId,
      limit: CHAT_PAGE_SIZE,
      parentId: undefined,
    });
    queryClient.setQueryData(messagesKey, {
      pageParams: [null],
      pages: [
        {
          items: [
            {
              id: 'message-1',
              messagePayload: { text: 'Das Passwort ist 1234' },
              reactions: [{ emoji: '👍', userId: 'user-uuid-123', userName: 'Anna' }],
            },
          ],
        },
      ],
    } as never);
    const { unmount } = renderSSE([chatId]);
    jest.advanceTimersByTime(1);

    const onMessage = streamListener('message');
    onMessage?.({
      data: JSON.stringify({
        type: 'message_deleted',
        chatId,
        senderId: 'someone-else',
        message: {
          id: 'message-1',
          createdAt: '2027-07-24T09:00:00Z',
          messagePayload: {},
          senderId: 'someone-else',
          status: 'STORED',
          type: 'TEXT_MSG',
          deletedAt: '2027-07-24T09:05:00Z',
        },
      }),
    });

    expect(queryClient.getQueryData(messagesKey)?.pages[0]?.items[0]).toMatchObject({
      id: 'message-1',
      messagePayload: {},
      reactions: [],
      deletedAt: new Date('2027-07-24T09:05:00Z'),
    });
    expect(queryClient.getQueryState(messagesKey)?.isInvalidated).toBe(false);
    expect(queryClient.getQueryData(chatsKey)).toEqual([
      expect.objectContaining({
        lastMessage: expect.objectContaining({
          messagePreview: expect.objectContaining({ de: 'Nachricht gelöscht' }) as unknown,
        }) as unknown,
      }),
    ]);

    unmount();
    jest.advanceTimersByTime(1);
  });

  it('shows the edit in an open thread or quote, and refetches no other message', async () => {
    const chatId = '550e8400-e29b-41d4-a716-446655440000';
    let editedText = 'Treffpunkt beim Hof Züri 11';
    testTrpc = createTestTrpc({
      'chat.getMessage': (input) => {
        const { messageId } = input as { messageId: string };
        return { id: messageId, messagePayload: { text: editedText } };
      },
    });
    const { trpc, queryClient, calls, wrapper } = testTrpc;
    queryClient.setQueryData(trpc.chat.user.queryKey({}), 'user-uuid-123');
    for (const messageId of ['message-1', 'message-2']) {
      queryClient.setQueryData(trpc.chat.getMessage.queryKey({ messageId }), {
        id: messageId,
        messagePayload: { text: editedText },
      } as never);
    }
    // what a thread header and a quote preview read
    const shown = (messageId: string): { current: unknown } =>
      renderHook(() => useQuery(trpc.chat.getMessage.queryOptions({ messageId })), { wrapper })
        .result;
    const edited = shown('message-1');
    const other = shown('message-2');
    const { unmount } = renderSSE([chatId]);
    jest.advanceTimersByTime(1);

    editedText = 'Treffpunkt beim Hof Cevi Uster';
    streamListener('message')?.({
      data: JSON.stringify({
        type: 'message_updated',
        chatId,
        senderId: 'someone-else',
        message: {
          id: 'message-1',
          createdAt: '2027-07-24T09:00:00Z',
          messagePayload: { text: editedText },
          senderId: 'someone-else',
          status: 'STORED',
          type: 'TEXT_MSG',
        },
      }),
    });

    await waitFor(() =>
      expect(edited.current).toMatchObject({
        data: { messagePayload: { text: 'Treffpunkt beim Hof Cevi Uster' } },
      }),
    );
    expect(other.current).toMatchObject({
      data: { messagePayload: { text: 'Treffpunkt beim Hof Züri 11' } },
    });
    expect(calls.filter(({ path }) => path === 'chat.getMessage')).toEqual([
      { path: 'chat.getMessage', input: { messageId: 'message-1' } },
    ]);

    unmount();
    jest.advanceTimersByTime(1);
  });

  it('refetches the open chat and the feature flags once after a delivery gap', () => {
    const chatId = '550e8400-e29b-41d4-a716-446655440000';
    const otherChatId = '550e8400-e29b-41d4-a716-446655440001';
    const { trpc, queryClient } = testTrpc;
    const messagesKey = (id: string): QueryKey =>
      trpc.chat.infiniteMessages.infiniteQueryKey({
        chatId: id,
        limit: CHAT_PAGE_SIZE,
        parentId: undefined,
      });
    const flagsKey = trpc.chat.getFeatureFlags.queryKey();
    for (const id of [chatId, otherChatId]) {
      queryClient.setQueryData(messagesKey(id), { pages: [], pageParams: [] });
    }
    queryClient.setQueryData(flagsKey, {} as never);
    const invalidations = countInvalidations();
    const { unmount } = renderSSE([chatId]);
    jest.advanceTimersByTime(1);

    const onResync = streamListener('resync');
    onResync?.({});
    // the refetch is spread over a jitter window of up to 3 s
    jest.advanceTimersByTime(3000);

    expect(invalidations(messagesKey(chatId))).toBe(1);
    // only the chats this screen shows
    expect(invalidations(messagesKey(otherChatId))).toBe(0);
    expect(invalidations(flagsKey)).toBe(1);

    unmount();
    jest.advanceTimersByTime(1);
  });
});
