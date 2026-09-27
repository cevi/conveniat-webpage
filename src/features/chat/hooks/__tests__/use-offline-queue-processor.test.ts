/**
 * @jest-environment jsdom
 */

import type { ChatDetails, ChatMessage } from '@/features/chat/api/types';
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
import { trpc } from '@/trpc/client';
import { renderHook, waitFor } from '@testing-library/react';
import { TRPCClientError } from '@trpc/client';

// the generated prisma client cannot be loaded under jsdom; the drain only needs its enums
jest.mock('@/lib/prisma/client', () => ({
  ChatType: { ONE_TO_ONE: 'ONE_TO_ONE', GROUP: 'GROUP' },
  MessageEventType: { CREATED: 'CREATED', STORED: 'STORED' },
  MessageType: { TEXT_MSG: 'TEXT_MSG', IMAGE_MSG: 'IMAGE_MSG' },
}));

jest.mock('@/trpc/client', () => ({
  trpc: {
    useUtils: jest.fn(),
    chat: {
      sendMessage: { useMutation: jest.fn() },
      createChat: { useMutation: jest.fn() },
    },
  },
}));

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

interface CachedQueries {
  chats: ChatWithMessagePreview[] | undefined;
  details: Map<string, ChatDetails | undefined>;
  messagePages: Map<string, { pages: { items: ChatMessage[] }[] } | undefined>;
}

const CURRENT_USER = 'user-1';

/** Same stand-in for the tRPC query cache as `use-create-chat.test.ts`. */
const createCacheStub = (): {
  cache: CachedQueries;
  utils: ReturnType<typeof trpc.useUtils>;
} => {
  const cache: CachedQueries = {
    chats: undefined,
    details: new Map(),
    messagePages: new Map(),
  };

  const utils = {
    chat: {
      user: { ensureData: jest.fn((): Promise<string> => Promise.resolve(CURRENT_USER)) },
      chats: {
        setData: (
          _input: unknown,
          updater: (
            old: ChatWithMessagePreview[] | undefined,
          ) => ChatWithMessagePreview[] | undefined,
        ): void => {
          cache.chats = updater(cache.chats);
        },
        invalidate: jest.fn(async (): Promise<void> => {}),
      },
      chatDetails: {
        setData: (
          { chatId }: { chatId: string },
          updater: ChatDetails | ((old: ChatDetails | undefined) => ChatDetails | undefined),
        ): void => {
          cache.details.set(
            chatId,
            typeof updater === 'function' ? updater(cache.details.get(chatId)) : updater,
          );
        },
      },
      infiniteMessages: {
        setInfiniteData: (
          { chatId }: { chatId: string },
          updater: (
            old: { pages: { items: ChatMessage[] }[] } | undefined,
          ) => { pages: { items: ChatMessage[] }[] } | undefined,
        ): void => {
          cache.messagePages.set(chatId, updater(cache.messagePages.get(chatId)));
        },
      },
    },
  };

  return { cache, utils: utils as unknown as ReturnType<typeof trpc.useUtils> };
};

const chatListEntry = (id: string, name: string): ChatWithMessagePreview =>
  ({ id, name }) as unknown as ChatWithMessagePreview;

/** Drains the outbox once and resolves the created chat id the server answers with. */
const renderProcessor = (
  createdChatId: string,
  initialChats: ChatWithMessagePreview[],
): { cache: CachedQueries; createChat: jest.Mock; unmount: () => void } => {
  const { cache, utils } = createCacheStub();
  cache.chats = initialChats;
  (trpc.useUtils as unknown as jest.Mock).mockReturnValue(utils);
  (trpc.chat.sendMessage.useMutation as unknown as jest.Mock).mockReturnValue({
    mutateAsync: jest.fn(),
  });

  const createChat = jest.fn((): Promise<string> => Promise.resolve(createdChatId));
  (trpc.chat.createChat.useMutation as unknown as jest.Mock).mockReturnValue({
    mutateAsync: createChat,
  });

  const { unmount } = renderHook(() => useOfflineQueueProcessor());
  return { cache, createChat, unmount };
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
    const { cache, unmount } = renderProcessor('existing-chat-id', [
      chatListEntry(optimisticChatId, 'Anna Muster'),
      chatListEntry('existing-chat-id', 'Anna Muster'),
    ]);

    await waitFor(() => expect(getOfflineOutbox()).toEqual([]));

    // the placeholder is gone rather than renamed onto the id the real chat already holds
    expect(cache.chats?.map((chat) => chat.id)).toEqual(['existing-chat-id']);
    expect(cache.details.get(optimisticChatId)).toBeUndefined();
    expect(cache.messagePages.get(optimisticChatId)).toBeUndefined();

    // the user was sitting on a route the server will never answer for
    expect(mockRouterReplace).toHaveBeenCalledWith('/app/chat/existing-chat-id');
    unmount();
  });

  test('leaves the user alone when they are not looking at the discarded chat', async () => {
    navigateTo('/app/chat');
    const { cache, unmount } = renderProcessor('existing-chat-id', [
      chatListEntry(optimisticChatId, 'Anna Muster'),
    ]);

    await waitFor(() => expect(getOfflineOutbox()).toEqual([]));

    // no real chat in the list yet, so the placeholder is carried over to the real id
    expect(cache.chats?.map((chat) => chat.id)).toEqual(['existing-chat-id']);
    expect(mockRouterReplace).not.toHaveBeenCalled();
    unmount();
  });

  test('keeps the opened chat when the server stored it under the queued id', async () => {
    navigateTo(`/app/chat/${optimisticChatId}`);
    const { cache, createChat, unmount } = renderProcessor(optimisticChatId, [
      chatListEntry(optimisticChatId, 'Anna Muster'),
    ]);

    await waitFor(() => expect(getOfflineOutbox()).toEqual([]));

    // the queued uuid is handed to the server so the open route stays valid
    expect(createChat).toHaveBeenCalledWith(expect.objectContaining({ chatId: optimisticChatId }));
    expect(cache.chats?.map((chat) => chat.id)).toEqual([optimisticChatId]);
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
const renderDrain = (): { sendMessage: jest.Mock; unmount: () => void } => {
  const { utils } = createCacheStub();
  (trpc.useUtils as unknown as jest.Mock).mockReturnValue(utils);
  const sendMessage = jest.fn(
    (input: { messageId: string; chatId: string }): Promise<ChatMessage> =>
      Promise.resolve({
        id: input.messageId,
        createdAt: new Date(),
        messagePayload: {},
        senderId: CURRENT_USER,
        status: 'STORED',
        type: 'TEXT_MSG',
      }),
  );
  (trpc.chat.sendMessage.useMutation as unknown as jest.Mock).mockReturnValue({
    mutateAsync: sendMessage,
  });
  (trpc.chat.createChat.useMutation as unknown as jest.Mock).mockReturnValue({
    mutateAsync: jest.fn(),
  });
  const { unmount } = renderHook(() => useOfflineQueueProcessor());
  return { sendMessage, unmount };
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
    const { sendMessage, unmount } = renderDrain();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(sendMessage).not.toHaveBeenCalled();
    expect(getOfflineOutbox()).toHaveLength(1);

    setSendInFlight('msg-1', false);
    unmount();
  });
});

/** The error tRPC raises for an answer the server sent with the given code. */
const serverError = (code: string, httpStatus: number): TRPCClientError<never> =>
  TRPCClientError.from({
    error: { code: -32_000, message: code, data: { code, httpStatus, path: 'chat.sendMessage' } },
  });

describe('useOfflineQueueProcessor - a queued message the server did not take', () => {
  const chatId = 'chat-uster';
  const messageId = 'message-queued-in-the-forest';

  const drainAgainst = (
    failure: Error,
  ): { cache: CachedQueries; sendMessage: jest.Mock; unmount: () => void } => {
    const { cache, utils } = createCacheStub();
    cache.messagePages.set(chatId, {
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
        },
      ],
    });
    (trpc.useUtils as unknown as jest.Mock).mockReturnValue(utils);
    const sendMessage = jest.fn((): Promise<never> => Promise.reject(failure));
    (trpc.chat.sendMessage.useMutation as unknown as jest.Mock).mockReturnValue({
      mutateAsync: sendMessage,
    });
    (trpc.chat.createChat.useMutation as unknown as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
    });

    const { unmount } = renderHook(() => useOfflineQueueProcessor());
    return { cache, sendMessage, unmount };
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
    expect(cache.messagePages.get(chatId)?.pages[0]?.items[0]).toMatchObject({
      id: messageId,
      sendFailed: true,
      isPendingOffline: false,
    });
    unmount();
  });
});
