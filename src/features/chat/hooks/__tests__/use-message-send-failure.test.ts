/**
 * @jest-environment jsdom
 */

import { CHAT_PAGE_SIZE } from '@/features/chat/constants';
import { useMessageSend } from '@/features/chat/hooks/use-message-send';
import { getFailedChatMessages, getFailedSendInput } from '@/features/chat/utils/failed-sends';
import { getOfflineOutbox } from '@/features/chat/utils/offline-outbox';
import type { RouterInputs } from '@/trpc/client';
import type { TestTrpc } from '@/trpc/test-trpc';
import { createTestTrpc, testTrpcError } from '@/trpc/test-trpc';
import { act, renderHook, waitFor } from '@testing-library/react';

jest.mock('@/lib/prisma/client', () => ({
  ChatType: { ONE_TO_ONE: 'ONE_TO_ONE', GROUP: 'GROUP' },
  MessageEventType: { CREATED: 'CREATED', STORED: 'STORED' },
  MessageType: { TEXT_MSG: 'TEXT_MSG', IMAGE_MSG: 'IMAGE_MSG' },
}));

jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);

jest.mock('@/features/chat/context/chat-actions-context', () => ({
  useChatActions: (): { cancelQuote: () => void } => ({ cancelQuote: jest.fn() }),
}));

/** a send as the composer starts it; without a timestamp the hook takes the current time */
type SendInput = Omit<RouterInputs['chat']['sendMessage'], 'timestamp'> & { timestamp?: Date };

/**
 * Renders the hook signed in as `user-1` against a thread whose cached list is empty, with the
 * server answering each send through `sendMessage`.
 */
const renderWithCache = async (
  sendMessage: jest.Mock,
): Promise<
  TestTrpc & {
    send: (input: SendInput) => Promise<void>;
    messages: () => { id: string; sendFailed?: boolean; status: string; createdAt: Date }[];
  }
> => {
  const testTrpc = createTestTrpc({ 'chat.user': () => 'user-1', 'chat.sendMessage': sendMessage });
  const { trpc, queryClient, wrapper } = testTrpc;
  const threadKey = trpc.chat.infiniteMessages.infiniteQueryKey({
    chatId: 'chat-1',
    limit: CHAT_PAGE_SIZE,
    parentId: 'thread-1',
  });
  queryClient.setQueryData(threadKey, {
    pages: [{ items: [], nextCursor: undefined }],
    pageParams: [],
  });

  const { result } = renderHook(() => useMessageSend(), { wrapper });
  await waitFor(() => expect(queryClient.getQueryData(trpc.chat.user.queryKey({}))).toBe('user-1'));

  return {
    ...testTrpc,
    send: async (input): Promise<void> => {
      const sentBefore = sendMessage.mock.calls.length;
      act(() => {
        result.current.mutate({ timestamp: undefined, ...input });
      });
      await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(sentBefore + 1));
    },
    messages: () => queryClient.getQueryData(threadKey)?.pages.flatMap((page) => page.items) ?? [],
  };
};

/** the server refuses the send for good */
const refuse = (): never => {
  throw testTrpcError('INTERNAL_SERVER_ERROR');
};

describe('useMessageSend when the server refuses a message', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  const input = { chatId: 'chat-1', content: 'hello', parentId: 'thread-1', messageId: 'msg-1' };

  test('the bubble stays in place, marked as failed', async () => {
    const { send, messages } = await renderWithCache(jest.fn(refuse));
    await send(input);

    await waitFor(() => expect(messages()[0]).toMatchObject({ id: 'msg-1', sendFailed: true }));
    expect(messages()).toHaveLength(1);
    // the exact input is kept, so a retry resends into the same thread
    expect(getFailedSendInput('msg-1')).toMatchObject({ parentId: 'thread-1', content: 'hello' });
    // and it outlives a refetch that drops it from the query cache
    expect(getFailedChatMessages('chat-1', 'thread-1', 'user-1').map((m) => m.id)).toEqual([
      'msg-1',
    ]);
    // but not for someone else logging in on the same phone
    expect(getFailedChatMessages('chat-1', 'thread-1', 'user-2')).toEqual([]);
    // and a send refused for good is not replayed from the outbox
    expect(getOfflineOutbox()).toEqual([]);
  });

  test('a retry turns the failed bubble back into a pending one instead of adding a copy', async () => {
    // the retry is still on its way when the test looks
    const sendMessage = jest
      .fn((): Promise<never> => new Promise(() => {}))
      .mockImplementationOnce(refuse);
    const { send, messages } = await renderWithCache(sendMessage);
    await send(input);
    await waitFor(() => expect(messages()[0]?.sendFailed).toBe(true));
    const failedAt = messages()[0]?.createdAt;

    await send(input);

    expect(messages()).toHaveLength(1);
    expect(messages()[0]?.sendFailed).toBeUndefined();
    expect(messages()[0]?.status).toBe('CREATED');
    // keeps its place in the list
    expect(messages()[0]?.createdAt).toBe(failedAt);
  });
});
