/**
 * @jest-environment jsdom
 */

import type { ChatDetails, ChatMessage } from '@/features/chat/api/types';
import { useOfflineQueueProcessor } from '@/features/chat/hooks/use-offline-queue-processor';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { generateChatId } from '@/features/chat/utils';
import { getOfflineOutbox, saveOfflineOutbox } from '@/features/chat/utils/offline-outbox';
import { trpc } from '@/trpc/client';
import { renderHook, waitFor } from '@testing-library/react';

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
