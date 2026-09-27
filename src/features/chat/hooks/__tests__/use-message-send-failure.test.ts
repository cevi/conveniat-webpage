/**
 * @jest-environment jsdom
 */

import type { ChatMessage } from '@/features/chat/api/types';
import { useMessageSend } from '@/features/chat/hooks/use-message-send';
import { getFailedChatMessages, getFailedSendInput } from '@/features/chat/utils/failed-sends';
import { trpc } from '@/trpc/client';
import { renderHook } from '@testing-library/react';

jest.mock('@/lib/prisma/client', () => ({
  ChatType: { ONE_TO_ONE: 'ONE_TO_ONE', GROUP: 'GROUP' },
  MessageEventType: { CREATED: 'CREATED', STORED: 'STORED' },
  MessageType: { TEXT_MSG: 'TEXT_MSG', IMAGE_MSG: 'IMAGE_MSG' },
}));

jest.mock('@/trpc/client', () => ({
  trpc: {
    useUtils: jest.fn(),
    chat: {
      user: { useQuery: jest.fn() },
      sendMessage: { useMutation: jest.fn() },
    },
  },
}));

jest.mock('@/features/chat/context/chat-actions-context', () => ({
  useChatActions: (): { cancelQuote: () => void } => ({ cancelQuote: jest.fn() }),
}));

jest.mock('@/lib/toast', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

interface InfiniteData {
  pages: { items: ChatMessage[]; nextCursor?: string }[];
  pageParams: unknown[];
}

interface SendMutationOptions {
  onMutate: (input: Record<string, unknown>) => Promise<unknown>;
  onError: (error: Error, input: Record<string, unknown>, context: unknown) => void;
}

/** Renders the hook against a real in-memory message cache and returns it with the handlers. */
const renderWithCache = (): { options: SendMutationOptions; messages: () => ChatMessage[] } => {
  let infinite: InfiniteData | undefined = { pages: [{ items: [] }], pageParams: [] };
  (trpc.useUtils as unknown as jest.Mock).mockReturnValue({
    chat: {
      chatDetails: { cancel: jest.fn(), getData: jest.fn(), setData: jest.fn() },
      infiniteMessages: {
        cancel: jest.fn(),
        getInfiniteData: (): InfiniteData | undefined => infinite,
        setInfiniteData: (
          _input: unknown,
          updater: (old: InfiniteData | undefined) => InfiniteData | undefined,
        ): void => {
          infinite = updater(infinite);
        },
      },
      chats: { setData: jest.fn(), invalidate: jest.fn(async () => {}) },
    },
  });
  (trpc.chat.user.useQuery as unknown as jest.Mock).mockReturnValue({ data: 'user-1' });

  let options: SendMutationOptions | undefined;
  (trpc.chat.sendMessage.useMutation as unknown as jest.Mock).mockImplementation(
    (mutationOptions: SendMutationOptions) => {
      options = mutationOptions;
      return {};
    },
  );
  renderHook(() => useMessageSend());
  if (options === undefined) throw new Error('send mutation was not registered');
  return { options, messages: () => infinite?.pages.flatMap((page) => page.items) ?? [] };
};

describe('useMessageSend when the server refuses a message', () => {
  beforeEach(() => localStorage.clear());

  const input = { chatId: 'chat-1', content: 'hello', parentId: 'thread-1', messageId: 'msg-1' };

  test('the bubble stays in place, marked as failed', async () => {
    const { options, messages } = renderWithCache();
    const context = await options.onMutate(input);
    options.onError(new Error('INTERNAL_SERVER_ERROR'), input, context);

    expect(messages()).toHaveLength(1);
    expect(messages()[0]).toMatchObject({ id: 'msg-1', sendFailed: true });
    // the exact input is kept, so a retry resends into the same thread
    expect(getFailedSendInput('msg-1')).toMatchObject({ parentId: 'thread-1', content: 'hello' });
    // and it outlives a refetch that drops it from the query cache
    expect(getFailedChatMessages('chat-1', 'thread-1').map((m) => m.id)).toEqual(['msg-1']);
  });

  test('a retry turns the failed bubble back into a pending one instead of adding a copy', async () => {
    const { options, messages } = renderWithCache();
    const context = await options.onMutate(input);
    options.onError(new Error('INTERNAL_SERVER_ERROR'), input, context);
    const failedAt = messages()[0]?.createdAt;

    await options.onMutate(input);

    expect(messages()).toHaveLength(1);
    expect(messages()[0]?.sendFailed).toBeUndefined();
    expect(messages()[0]?.status).toBe('CREATED');
    // keeps its place in the list
    expect(messages()[0]?.createdAt).toBe(failedAt);
  });
});
