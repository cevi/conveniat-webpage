/**
 * @jest-environment jsdom
 */

import { CHAT_PAGE_SIZE } from '@/features/chat/constants';
import { useMessageSend } from '@/features/chat/hooks/use-message-send';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { getOfflineOutbox } from '@/features/chat/utils/offline-outbox';
import { ChatStatus } from '@/lib/chat-shared';
import type { RouterInputs } from '@/trpc/client';
import type { TestTrpc } from '@/trpc/test-trpc';
import { createTestTrpc } from '@/trpc/test-trpc';
import { act, renderHook, waitFor } from '@testing-library/react';
import { TRPCClientError } from '@trpc/client';

// the generated prisma client cannot be loaded under jsdom; the hook only needs its enums

jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);

jest.mock('@/features/chat/context/chat-actions-context', () => ({
  useChatActions: (): { cancelQuote: () => void } => ({ cancelQuote: jest.fn() }),
}));

const CHAT_ID = 'chat-1';

/** a send as the composer starts it; without a timestamp the hook takes the current time */
type SendInput = Omit<RouterInputs['chat']['sendMessage'], 'timestamp'> & { timestamp?: Date };

const buildExistingChat = (): ChatWithMessagePreview => ({
  id: CHAT_ID,
  name: 'Test Chat',
  status: ChatStatus.OPEN,
  chatType: 'ONE_TO_ONE',
  lastMessage: {
    id: 'msg-0',
    senderId: 'someone-else',
    messagePreview: 'previous message',
    createdAt: new Date(),
    status: 'STORED',
  },
  lastUpdate: new Date(),
  unreadCount: 0,
  messageCount: 1,
  userChatPermission: 'MEMBER',
});

interface RenderedSend extends TestTrpc {
  /** starts a send and waits until its request is open on the server */
  send: (input: SendInput) => Promise<void>;
  /** settles the request that reached the server last */
  answer: (outcome: { data: unknown } | { error: unknown }) => Promise<void>;
  /** what the chat view shows, the newest message first */
  messages: () => { id: string }[];
}

/**
 * Renders the hook signed in as `user-1`, with the server holding every send open until the
 * test answers it.
 */
const renderSendMutation = async (): Promise<RenderedSend> => {
  const pending: { resolve: (data: unknown) => void; reject: (error: unknown) => void }[] = [];
  const sendMessage = jest.fn(
    () =>
      new Promise((resolve, reject) => {
        pending.push({ resolve, reject });
      }),
  );
  const testTrpc = createTestTrpc({ 'chat.user': () => 'user-1', 'chat.sendMessage': sendMessage });
  const { trpc, queryClient, wrapper } = testTrpc;
  queryClient.setQueryData(trpc.chat.chats.queryKey({}), [buildExistingChat()]);

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
    answer: async (outcome): Promise<void> => {
      const request = pending.shift();
      if (request === undefined) throw new Error('no send is open on the server');
      await act(async () => {
        if ('data' in outcome) request.resolve(outcome.data);
        else request.reject(outcome.error);
        await Promise.resolve();
      });
      await waitFor(() => expect(result.current.isPending).toBe(false));
    },
    messages: () =>
      queryClient
        .getQueryData(
          trpc.chat.infiniteMessages.infiniteQueryKey({
            chatId: CHAT_ID,
            limit: CHAT_PAGE_SIZE,
            parentId: undefined,
          }),
        )
        ?.pages.flatMap((page) => page.items) ?? [],
  };
};

/** Sends `content` and returns the chat overview entry produced by the optimistic update. */
const runOptimisticUpdate = async (content: string): Promise<ChatWithMessagePreview> => {
  const { send, trpc, queryClient } = await renderSendMutation();
  await send({ chatId: CHAT_ID, content });

  const chat = queryClient.getQueryData(trpc.chat.chats.queryKey({}))?.[0];
  if (chat === undefined) throw new Error('optimistic update did not produce a chat');
  return chat;
};

describe('useMessageSend optimistic chat overview update', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('previews the plain message text without JSON quoting', async () => {
    const chat = await runOptimisticUpdate('Test');

    expect(chat.lastMessage?.messagePreview).toBe('Test');
  });

  it('does not escape quotes or backslashes contained in the message', async () => {
    const chat = await runOptimisticUpdate(String.raw`He said "hi" \o/`);

    expect(chat.lastMessage?.messagePreview).toBe(String.raw`He said "hi" \o/`);
  });

  it('trims surrounding whitespace like the sent message does', async () => {
    const chat = await runOptimisticUpdate('  padded  ');

    expect(chat.lastMessage?.messagePreview).toBe('padded');
  });
});

/**
 * Sending is replayed from the offline outbox, so the id the client picks has to survive
 * the whole round trip: optimistic bubble -> request -> outbox entry -> replayed request.
 * If it did not, the server could not tell a replay apart from a new message and would
 * store the message twice.
 */
describe('useMessageSend message identity', () => {
  const MESSAGE_ID = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('uses the id sent to the server for the optimistic message', async () => {
    const { send, messages, calls } = await renderSendMutation();
    await send({ chatId: CHAT_ID, content: 'queued while offline', messageId: MESSAGE_ID });

    expect(calls.at(-1)).toMatchObject({
      path: 'chat.sendMessage',
      input: { messageId: MESSAGE_ID },
    });
    expect(messages().map((message) => message.id)).toEqual([MESSAGE_ID]);
  });

  it('queues a dropped send under that same id so the replay is recognised', async () => {
    const { send, answer } = await renderSendMutation();
    await send({
      chatId: CHAT_ID,
      content: 'queued while offline',
      messageId: MESSAGE_ID,
      timestamp: new Date(),
    });

    await answer({ error: new TRPCClientError('Failed to fetch') });

    expect(getOfflineOutbox()).toStrictEqual([
      expect.objectContaining({ type: 'MESSAGE', id: MESSAGE_ID, chatId: CHAT_ID }),
    ]);
  });
});

/**
 * The composer is emptied the moment the user presses send. If the PWA is suspended or
 * killed before the request settles, the outbox holds the only copy of the text.
 */
describe('useMessageSend outbox while the request is open', () => {
  const MESSAGE_ID = '22222222-2222-4222-8222-222222222222';

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('queues the whole send, with its author, before the request settles', async () => {
    const { send } = await renderSendMutation();
    await send({
      chatId: CHAT_ID,
      content: 'written just before the app was closed',
      parentId: 'thread-1',
      messageId: MESSAGE_ID,
      timestamp: new Date('2026-07-25T08:00:00.000Z'),
    });

    expect(getOfflineOutbox()).toStrictEqual([
      expect.objectContaining({
        id: MESSAGE_ID,
        chatId: CHAT_ID,
        content: 'written just before the app was closed',
        messageType: 'TEXT_MSG',
        parentId: 'thread-1',
        createdAt: '2026-07-25T08:00:00.000Z',
        userId: 'user-1',
      }),
    ]);
  });

  it('queues an image as an image', async () => {
    const { send } = await renderSendMutation();
    await send({
      chatId: CHAT_ID,
      content: 'chat-images/chat-1/photo.jpg',
      type: 'IMAGE_MSG',
      messageId: MESSAGE_ID,
    });

    expect(getOfflineOutbox()).toStrictEqual([
      expect.objectContaining({ id: MESSAGE_ID, messageType: 'IMAGE_MSG' }),
    ]);
  });

  it('leaves the outbox once the server stored the message', async () => {
    const { send, answer } = await renderSendMutation();
    await send({ chatId: CHAT_ID, content: 'hello', messageId: MESSAGE_ID });
    expect(getOfflineOutbox()).toHaveLength(1);

    await answer({ data: { id: MESSAGE_ID, createdAt: new Date(), messagePayload: {} } });

    expect(getOfflineOutbox()).toEqual([]);
  });
});
