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

describe('useChatSSE', () => {
  let mockEventSourceConstructor: jest.Mock;
  const mockAddEventListener = jest.fn();
  const mockClose = jest.fn();

  beforeEach(() => {
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
        chats: { invalidate: jest.fn().mockResolvedValue(true) },
        infiniteMessages: {
          invalidate: jest.fn().mockResolvedValue(true),
          setInfiniteData: jest.fn(),
        },
        chatDetails: {
          invalidate: jest.fn().mockResolvedValue(true),
          setData: jest.fn(),
        },
        getMessage: { setData: jest.fn() },
      },
    });

    (trpc.chat.user.useQuery as unknown as jest.Mock).mockReturnValue({
      data: 'user-uuid-123',
    });
  });

  it('constructs correct EventSource URL with user channel and non-empty chat IDs', () => {
    const chatId = '550e8400-e29b-41d4-a716-446655440000';
    renderHook(() => useChatSSE([chatId, '', '   ']));

    expect(mockEventSourceConstructor).toHaveBeenCalledTimes(1);
    const calls = mockEventSourceConstructor.mock.calls as string[][];
    const calledUrl = calls[0]?.[0] ?? '';
    expect(calledUrl).toContain('/api/chat/sse?chatIds=');
    expect(calledUrl).toContain(chatId);
    expect(calledUrl).toContain('user-uuid-123');
    expect(calledUrl).not.toContain('chatIds=,');
    expect(calledUrl).not.toMatch(/chatIds=(,|$)/);
  });

  it('connects to user channel when chatIds is empty array', () => {
    renderHook(() => useChatSSE([]));

    expect(mockEventSourceConstructor).toHaveBeenCalledTimes(1);
    const calls = mockEventSourceConstructor.mock.calls as string[][];
    const calledUrl = calls[0]?.[0] ?? '';
    expect(calledUrl).toBe('/api/chat/sse?chatIds=user-uuid-123');
  });

  it('does not open EventSource if currentUser is empty or undefined', () => {
    (trpc.chat.user.useQuery as unknown as jest.Mock).mockReturnValue({
      data: undefined,
    });

    renderHook(() => useChatSSE(['550e8400-e29b-41d4-a716-446655440000']));

    expect(mockEventSourceConstructor).not.toHaveBeenCalled();
  });
});
