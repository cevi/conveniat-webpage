/**
 * @jest-environment jsdom
 */

import { useChatSSE } from '@/features/chat/hooks/use-chat-sse';
import { trpc } from '@/trpc/client';
import { renderHook } from '@testing-library/react';

jest.mock('superjson', () => ({
  parse: (data: unknown): unknown => JSON.parse(data as string),
  stringify: (data: unknown): string => JSON.stringify(data),
}));

jest.mock('@/trpc/client', () => ({
  trpc: {
    useUtils: jest.fn(),
    chat: {
      user: {
        useQuery: jest.fn(),
      },
    },
  },
}));

jest.mock('@/features/chat/utils/realtime-message-notification', () => ({
  notifyRealtimeChatMessage: jest.fn(),
}));

describe('useChatSSE', () => {
  let mockEventSourceConstructor: jest.Mock;
  const mockAddEventListener = jest.fn();
  const mockClose = jest.fn();

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

    (trpc.useUtils as unknown as jest.Mock).mockReturnValue({
      chat: {
        chats: {
          invalidate: jest.fn().mockResolvedValue(true),
          getData: jest.fn(),
          setData: jest.fn(),
        },
        infiniteMessages: {
          invalidate: jest.fn().mockResolvedValue(true),
          setInfiniteData: jest.fn(),
        },
        chatDetails: {
          invalidate: jest.fn().mockResolvedValue(true),
          setData: jest.fn(),
        },
        getMessage: { setData: jest.fn(), invalidate: jest.fn().mockResolvedValue(true) },
        getFeatureFlags: { invalidate: jest.fn().mockResolvedValue(true) },
      },
    });

    (trpc.chat.user.useQuery as unknown as jest.Mock).mockReturnValue({
      data: 'user-uuid-123',
    });
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
    const { unmount } = renderHook(() => useChatSSE([chatId, '', '   ']));

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
    const { unmount } = renderHook(() => useChatSSE([]));

    jest.advanceTimersByTime(1);

    expect(mockEventSourceConstructor).toHaveBeenCalledTimes(1);
    const calls = mockEventSourceConstructor.mock.calls as string[][];
    const calledUrl = calls[0]?.[0] ?? '';
    expect(calledUrl).toBe('/api/chat/sse?chatIds=user-uuid-123');

    unmount();
    jest.advanceTimersByTime(1);
  });

  it('does not open EventSource if currentUser is empty or undefined', () => {
    (trpc.chat.user.useQuery as unknown as jest.Mock).mockReturnValue({
      data: undefined,
    });

    const { unmount } = renderHook(() => useChatSSE(['550e8400-e29b-41d4-a716-446655440000']));

    jest.advanceTimersByTime(1);

    expect(mockEventSourceConstructor).not.toHaveBeenCalled();

    unmount();
    jest.advanceTimersByTime(1);
  });

  it('patches the chat list for a new message instead of refetching it', () => {
    const chatId = '550e8400-e29b-41d4-a716-446655440000';
    const otherChatId = '550e8400-e29b-41d4-a716-446655440001';
    const utils = (trpc.useUtils as unknown as jest.Mock)() as {
      chat: { chats: { invalidate: jest.Mock; getData: jest.Mock; setData: jest.Mock } };
    };
    utils.chat.chats.getData.mockReturnValue([
      { id: otherChatId, unreadCount: 0, messageCount: 1 },
      { id: chatId, unreadCount: 0, messageCount: 1 },
    ]);
    const { unmount } = renderHook(() => useChatSSE([chatId]));
    jest.advanceTimersByTime(1);

    const onMessage = (
      mockAddEventListener.mock.calls as [string, (event: unknown) => void][]
    ).findLast(([type]) => type === 'message')?.[1];
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

    expect(utils.chat.chats.invalidate).not.toHaveBeenCalled();
    expect(utils.chat.chats.setData).toHaveBeenCalledWith({}, [
      expect.objectContaining({ id: chatId, unreadCount: 1 }),
      expect.objectContaining({ id: otherChatId, unreadCount: 0 }),
    ]);

    unmount();
    jest.advanceTimersByTime(1);
  });

  it('refetches the open chat and the feature flags once after a delivery gap', () => {
    const chatId = '550e8400-e29b-41d4-a716-446655440000';
    const utils = (trpc.useUtils as unknown as jest.Mock)() as {
      chat: {
        infiniteMessages: { invalidate: jest.Mock };
        getFeatureFlags: { invalidate: jest.Mock };
      };
    };
    const { unmount } = renderHook(() => useChatSSE([chatId]));
    jest.advanceTimersByTime(1);

    const onResync = (
      mockAddEventListener.mock.calls as [string, (event: unknown) => void][]
    ).findLast(([type]) => type === 'resync')?.[1];
    onResync?.({});
    // the refetch is spread over a jitter window of up to 3 s
    jest.advanceTimersByTime(3000);

    expect(utils.chat.infiniteMessages.invalidate).toHaveBeenCalledTimes(1);
    expect(utils.chat.infiniteMessages.invalidate).toHaveBeenCalledWith({ chatId });
    expect(utils.chat.getFeatureFlags.invalidate).toHaveBeenCalledTimes(1);

    unmount();
    jest.advanceTimersByTime(1);
  });
});
