/**
 * @jest-environment jsdom
 */

import type { ChatMessage } from '@/features/chat/api/types';
import { CHAT_PAGE_SIZE } from '@/features/chat/constants';
import { useOfflineQueueProcessor } from '@/features/chat/hooks/use-offline-queue-processor';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { generateChatId } from '@/features/chat/utils';
import { getFailedChatMessages, getFailedSendInput } from '@/features/chat/utils/failed-sends';
import {
  getOfflineOutbox,
  saveOfflineOutbox,
  setSendInFlight,
  type OfflineMessage,
} from '@/features/chat/utils/offline-outbox';
import type { ProcedureHandler, TestTrpc } from '@/trpc/test-trpc';
import { createTestTrpc, testTrpcError } from '@/trpc/test-trpc';
import { renderHook, waitFor } from '@testing-library/react';
import { TRPCClientError } from '@trpc/client';
import type { TRPC_ERROR_CODE_KEY } from '@trpc/server';

// the generated prisma client cannot be loaded under jsdom; the drain only needs its enums
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

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: (): boolean => true,
}));

const mockRouterReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: (): { replace: jest.Mock } => ({ replace: mockRouterReplace }),
}));

/** The drain reads the live `location`, so tests drive the route through history. */
const navigateTo = (path: string): void => {
  globalThis.history.replaceState({}, '', path);
};

const CURRENT_USER = 'user-1';

/** What the chat screens read from the query cache for one chat. */
interface ChatCaches {
  chats: () => { id: string }[] | undefined;
  details: (chatId: string) => unknown;
  messages: (chatId: string) => { pages: { items: ChatMessage[] }[] } | undefined;
}

const chatCachesOf = ({ trpc, queryClient }: TestTrpc): ChatCaches => ({
  chats: () => queryClient.getQueryData(trpc.chat.chats.queryKey({})),
  details: (chatId) => queryClient.getQueryData(trpc.chat.chatDetails.queryKey({ chatId })),
  messages: (chatId) =>
    queryClient.getQueryData(
      trpc.chat.infiniteMessages.infiniteQueryKey({
        chatId,
        limit: CHAT_PAGE_SIZE,
        parentId: undefined,
      }),
    ),
});

/** A drain signed in as {@link CURRENT_USER}, with the server answering through `handlers`. */
const createDrainTrpc = (handlers: Record<string, ProcedureHandler>): TestTrpc =>
  createTestTrpc({ 'chat.user': () => CURRENT_USER, ...handlers });

const chatListEntry = (id: string, name: string): ChatWithMessagePreview =>
  ({ id, name }) as unknown as ChatWithMessagePreview;

/** Drains the outbox once and resolves the created chat id the server answers with. */
const renderProcessor = (
  createdChatId: string,
  initialChats: ChatWithMessagePreview[],
  optimisticChatId: string,
): { cache: ChatCaches; createChat: jest.Mock; unmount: () => void } => {
  const createChat = jest.fn((): string => createdChatId);
  const testTrpc = createDrainTrpc({ 'chat.createChat': createChat });
  const { trpc, queryClient, wrapper } = testTrpc;
  queryClient.setQueryData(trpc.chat.chats.queryKey({}), initialChats);
  // what `useCreateChat` seeded when the chat was created offline
  queryClient.setQueryData(trpc.chat.chatDetails.queryKey({ chatId: optimisticChatId }), {
    id: optimisticChatId,
    messages: [],
  } as never);
  queryClient.setQueryData(
    trpc.chat.infiniteMessages.infiniteQueryKey({
      chatId: optimisticChatId,
      limit: CHAT_PAGE_SIZE,
      parentId: undefined,
    }),
    { pages: [{ items: [], nextCursor: undefined }], pageParams: [null] },
  );

  const { unmount } = renderHook(() => useOfflineQueueProcessor(), { wrapper });
  return { cache: chatCachesOf(testTrpc), createChat, unmount };
};

describe('useOfflineQueueProcessor - replaying a queued chat creation', () => {
  let optimisticChatId: string;

  beforeEach(() => {
    localStorage.clear();
    mockRouterReplace.mockClear();
    optimisticChatId = generateChatId();
    saveOfflineOutbox([
      {
        type: 'CREATE_CHAT',
        id: optimisticChatId,
        chatName: undefined,
        memberIds: ['user-anna'],
        createdAt: new Date().toISOString(),
      },
    ]);
  });

  test('follows the existing chat when the server dedupes the one-to-one creation', async () => {
    navigateTo(`/app/chat/${optimisticChatId}`);
    const { cache, unmount } = renderProcessor(
      'existing-chat-id',
      [
        chatListEntry(optimisticChatId, 'Anna Muster'),
        chatListEntry('existing-chat-id', 'Anna Muster'),
      ],
      optimisticChatId,
    );

    await waitFor(() => expect(getOfflineOutbox()).toEqual([]));

    // the placeholder is gone rather than renamed onto the id the real chat already holds
    expect(cache.chats()?.map((chat) => chat.id)).toEqual(['existing-chat-id']);
    expect(cache.details(optimisticChatId)).toBeUndefined();
    expect(cache.messages(optimisticChatId)).toBeUndefined();

    // the user was sitting on a route the server will never answer for
    expect(mockRouterReplace).toHaveBeenCalledWith('/app/chat/existing-chat-id');
    unmount();
  });

  test('leaves the user alone when they are not looking at the discarded chat', async () => {
    navigateTo('/app/chat');
    const { cache, unmount } = renderProcessor(
      'existing-chat-id',
      [chatListEntry(optimisticChatId, 'Anna Muster')],
      optimisticChatId,
    );

    await waitFor(() => expect(getOfflineOutbox()).toEqual([]));

    // no real chat in the list yet, so the placeholder is carried over to the real id
    expect(cache.chats()?.map((chat) => chat.id)).toEqual(['existing-chat-id']);
    expect(mockRouterReplace).not.toHaveBeenCalled();
    unmount();
  });

  test('keeps the opened chat when the server stored it under the queued id', async () => {
    navigateTo(`/app/chat/${optimisticChatId}`);
    const { cache, createChat, unmount } = renderProcessor(
      optimisticChatId,
      [chatListEntry(optimisticChatId, 'Anna Muster')],
      optimisticChatId,
    );

    await waitFor(() => expect(getOfflineOutbox()).toEqual([]));

    // the queued uuid is handed to the server so the open route stays valid
    expect(createChat).toHaveBeenCalledWith(expect.objectContaining({ chatId: optimisticChatId }));
    expect(cache.chats()?.map((chat) => chat.id)).toEqual([optimisticChatId]);
    expect(mockRouterReplace).not.toHaveBeenCalled();
    unmount();
  });
});

const queuedMessage = (overrides: Partial<OfflineMessage>): OfflineMessage => ({
  type: 'MESSAGE',
  id: 'msg-1',
  chatId: 'chat-1',
  content: 'hello',
  createdAt: new Date().toISOString(),
  userId: CURRENT_USER,
  ...overrides,
});

/** Drains the outbox once, answering every send with the stored message. */
const renderDrain = (): {
  sendMessage: jest.Mock;
  calls: TestTrpc['calls'];
  unmount: () => void;
} => {
  const sendMessage = jest.fn((input: unknown): ChatMessage => ({
    id: (input as { messageId: string }).messageId,
    createdAt: new Date(),
    messagePayload: {},
    senderId: CURRENT_USER,
    status: 'STORED',
    type: 'TEXT_MSG',
  }));
  const { wrapper, calls } = createDrainTrpc({ 'chat.sendMessage': sendMessage });
  const { unmount } = renderHook(() => useOfflineQueueProcessor(), { wrapper });
  return { sendMessage, calls, unmount };
};

describe('useOfflineQueueProcessor - replaying queued messages', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('a queued image is sent as an image, not as text holding its storage key', async () => {
    saveOfflineOutbox([
      queuedMessage({ content: 'chat-images/chat-1/photo.jpg', messageType: 'IMAGE_MSG' }),
    ]);
    const { sendMessage, unmount } = renderDrain();

    await waitFor(() => expect(getOfflineOutbox()).toEqual([]));
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'chat-images/chat-1/photo.jpg', type: 'IMAGE_MSG' }),
    );
    unmount();
  });

  test('the sends someone else queued on this phone are neither sent nor dropped', async () => {
    saveOfflineOutbox([
      queuedMessage({ id: 'msg-other', userId: 'user-2' }),
      queuedMessage({ id: 'msg-own' }),
    ]);
    const { sendMessage, unmount } = renderDrain();

    await waitFor(() => expect(getOfflineOutbox().map((item) => item.id)).toEqual(['msg-other']));
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith(expect.objectContaining({ messageId: 'msg-own' }));
    unmount();
  });

  test('a send queued by an older version without an owner is sent for the current user', async () => {
    saveOfflineOutbox([queuedMessage({ userId: undefined })]);
    const { sendMessage, unmount } = renderDrain();

    await waitFor(() => expect(getOfflineOutbox()).toEqual([]));
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ messageId: 'msg-1', type: undefined }),
    );
    unmount();
  });

  test('a send whose request is still open is not posted a second time', async () => {
    saveOfflineOutbox([queuedMessage({})]);
    setSendInFlight('msg-1', true);
    const { sendMessage, calls, unmount } = renderDrain();

    // the drain has asked who is signed in and gone through the queue
    await waitFor(() => expect(calls.map((call) => call.path)).toContain('chat.user'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(sendMessage).not.toHaveBeenCalled();
    expect(getOfflineOutbox()).toHaveLength(1);

    setSendInFlight('msg-1', false);
    unmount();
  });
});

/** The error tRPC raises for an answer the server sent with the given code. */
const serverError = (code: TRPC_ERROR_CODE_KEY, httpStatus: number): Error =>
  testTrpcError(code, { httpStatus, path: 'chat.sendMessage' });

describe('useOfflineQueueProcessor - a queued message the server did not take', () => {
  const chatId = 'chat-uster';
  const messageId = 'message-queued-in-the-forest';

  const drainAgainst = (
    failure: Error,
  ): { cache: ChatCaches; sendMessage: jest.Mock; unmount: () => void } => {
    const sendMessage = jest.fn((): never => {
      throw failure;
    });
    const testTrpc = createDrainTrpc({ 'chat.sendMessage': sendMessage });
    const { trpc, queryClient, wrapper } = testTrpc;
    queryClient.setQueryData(
      trpc.chat.infiniteMessages.infiniteQueryKey({
        chatId,
        limit: CHAT_PAGE_SIZE,
        parentId: undefined,
      }),
      {
        pages: [
          {
            items: [
              {
                id: messageId,
                messagePayload: { text: 'Wir sind beim Feuer' },
                createdAt: new Date('2027-07-26T18:00:00Z'),
                senderId: CURRENT_USER,
                status: 'CREATED',
                type: 'TEXT_MSG',
                isPendingOffline: true,
              } as unknown as ChatMessage,
            ],
            nextCursor: undefined,
          },
        ],
        pageParams: [null],
      },
    );

    const { unmount } = renderHook(() => useOfflineQueueProcessor(), { wrapper });
    return { cache: chatCachesOf(testTrpc), sendMessage, unmount };
  };

  beforeEach(() => {
    localStorage.clear();
    saveOfflineOutbox([
      {
        type: 'MESSAGE',
        id: messageId,
        chatId,
        content: 'Wir sind beim Feuer',
        createdAt: '2027-07-26T18:00:00.000Z',
        userId: CURRENT_USER,
      },
    ]);
  });

  it.each([
    ['the connection drops (Safari)', new TRPCClientError('Load failed')],
    ['the session expired', serverError('UNAUTHORIZED', 401)],
    ['the server crashed', serverError('INTERNAL_SERVER_ERROR', 500)],
  ])('keeps the message queued when %s', async (_case, failure) => {
    const { sendMessage, unmount } = drainAgainst(failure);

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalled();
    });

    expect(getOfflineOutbox()).toEqual([expect.objectContaining({ id: messageId })]);
    expect(getFailedChatMessages(chatId, undefined, CURRENT_USER)).toEqual([]);
    unmount();
  });

  it('keeps a message the server rejects for good as a failed bubble with its text', async () => {
    const { cache, unmount } = drainAgainst(serverError('BAD_REQUEST', 400));

    await waitFor(() => {
      expect(getOfflineOutbox()).toEqual([]);
    });

    expect(getFailedChatMessages(chatId, undefined, CURRENT_USER)).toEqual([
      expect.objectContaining({
        id: messageId,
        messagePayload: { text: 'Wir sind beim Feuer' },
        sendFailed: true,
        isPendingOffline: false,
      }),
    ]);
    // a retry replays the send exactly as it was queued
    expect(getFailedSendInput(messageId)).toMatchObject({
      chatId,
      content: 'Wir sind beim Feuer',
      messageId,
      timestamp: new Date('2027-07-26T18:00:00.000Z'),
    });
    expect(cache.messages(chatId)?.pages[0]?.items[0]).toMatchObject({
      id: messageId,
      sendFailed: true,
      isPendingOffline: false,
    });
    unmount();
  });
});
