/**
 * @jest-environment jsdom
 */

import type { Contact } from '@/features/chat/api/queries/list-contacts';
import type { ChatDetails, ChatMessage } from '@/features/chat/api/types';
import { useCreateChat } from '@/features/chat/hooks/use-create-chat';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { getOfflineOutbox } from '@/features/chat/utils/offline-outbox';
import { trpc } from '@/trpc/client';
import { renderHook } from '@testing-library/react';

// the generated prisma client cannot be loaded under jsdom; the hook only needs its enums
jest.mock('@prisma/client', () => ({
  ChatMembershipPermission: { OWNER: 'OWNER', MEMBER: 'MEMBER' },
  ChatType: { ONE_TO_ONE: 'ONE_TO_ONE', GROUP: 'GROUP' },
  MessageEventType: { CREATED: 'CREATED', STORED: 'STORED' },
  MessageType: { SYSTEM_MSG: 'SYSTEM_MSG' },
}));

jest.mock('@/trpc/client', () => ({
  trpc: {
    useUtils: jest.fn(),
    chat: {
      user: { useQuery: jest.fn() },
      createChat: { useMutation: jest.fn() },
    },
  },
}));

jest.mock('@/lib/toast', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const mockRouterReplace = jest.fn();
const mockPathname = { current: '/app/chat/new' };

jest.mock('next/navigation', () => ({
  useRouter: (): { replace: jest.Mock } => ({ replace: mockRouterReplace }),
  usePathname: (): string => mockPathname.current,
}));

const CURRENT_USER_ID = 'me';

const anna: Contact = { userId: 'user-anna', name: 'Anna Muster v/o Fuchs' };
const bruno: Contact = { userId: 'user-bruno', name: 'Bruno Beispiel' };

interface CreateChatVariables {
  chatId?: string;
  chatName: string | undefined;
  members: { userId: string }[];
}

interface CachedQueries {
  chats: ChatWithMessagePreview[] | undefined;
  details: Map<string, ChatDetails | undefined>;
  messagePages: Map<string, { pages: { items: ChatMessage[] }[] } | undefined>;
}

/**
 * Minimal stand-in for the tRPC query cache: `setData` updaters are applied to plain
 * maps, so a test can assert what the chat view would read for a given chat id.
 */
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
        refetch: jest.fn(async (): Promise<void> => {}),
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
        invalidate: jest.fn(async (): Promise<void> => {}),
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
        invalidate: jest.fn(async (): Promise<void> => {}),
      },
    },
  };

  return { cache, utils: utils as unknown as ReturnType<typeof trpc.useUtils> };
};

interface MutationOptions {
  onError: (error: { message: string }, variables: CreateChatVariables) => void;
  onSuccess: (createdChatId: string, variables: CreateChatVariables) => void;
}

const renderCreateChat = (): {
  cache: CachedQueries;
  createChat: ReturnType<typeof useCreateChat>['createChat'];
  mutate: jest.Mock;
  latestOptions: () => MutationOptions;
  rerender: () => void;
} => {
  const { cache, utils } = createCacheStub();
  (trpc.useUtils as unknown as jest.Mock).mockReturnValue(utils);
  (trpc.chat.user.useQuery as unknown as jest.Mock).mockReturnValue({ data: CURRENT_USER_ID });

  const mutate = jest.fn();
  let options: MutationOptions | undefined;
  (trpc.chat.createChat.useMutation as unknown as jest.Mock).mockImplementation(
    (mutationOptions: MutationOptions) => {
      options = mutationOptions;
      return { mutate };
    },
  );

  const { result, rerender } = renderHook(() => useCreateChat());

  return {
    cache,
    createChat: result.current.createChat,
    mutate,
    latestOptions: (): MutationOptions => {
      if (!options) throw new Error('useMutation was never called');
      return options;
    },
    rerender: (): void => rerender(),
  };
};

describe('useCreateChat', () => {
  beforeEach(() => {
    localStorage.clear();
    mockRouterReplace.mockClear();
    mockPathname.current = '/app/chat/new';
  });

  test('creates the chat under a client-generated id the server is asked to adopt', () => {
    const { createChat, mutate } = renderCreateChat();

    const chatId = createChat({ chatName: undefined, members: [anna] });

    expect(mutate).toHaveBeenCalledWith({
      chatId,
      chatName: undefined,
      members: [{ userId: anna.userId }],
    });
  });

  test('seeds the chat view so the new chat can be opened right away', () => {
    const { cache, createChat } = renderCreateChat();

    const chatId = createChat({ chatName: undefined, members: [anna] });

    // overview entry
    expect(cache.chats?.[0]).toMatchObject({ id: chatId, name: anna.name, unreadCount: 0 });

    // chat details, including the current user, so a group header counts everyone
    const details = cache.details.get(chatId);
    expect(details).toMatchObject({ id: chatId, name: anna.name, type: 'ONE_TO_ONE' });
    expect(details?.participants.map((participant) => participant.id)).toEqual([
      CURRENT_USER_ID,
      anna.userId,
    ]);

    // first page of messages, holding the "chat created" system message
    expect(cache.messagePages.get(chatId)?.pages[0]?.items).toHaveLength(1);
    expect(cache.messagePages.get(chatId)?.pages[0]?.items[0]).toMatchObject({
      type: 'SYSTEM_MSG',
    });
  });

  test('names a group chat after the entered group name', () => {
    const { cache, createChat } = renderCreateChat();

    const chatId = createChat({ chatName: 'Küchenteam', members: [anna, bruno] });

    expect(cache.chats?.[0]).toMatchObject({ id: chatId, name: 'Küchenteam', chatType: 'GROUP' });
    expect(cache.details.get(chatId)?.participants).toHaveLength(3);
  });

  test('queues the creation under the same id when offline, keeping the open chat intact', () => {
    const { cache, createChat, latestOptions } = renderCreateChat();

    const chatId = createChat({ chatName: undefined, members: [anna] });
    latestOptions().onError(
      { message: 'Failed to fetch' },
      { chatId, chatName: undefined, members: [{ userId: anna.userId }] },
    );

    expect(getOfflineOutbox()).toEqual([
      expect.objectContaining({
        type: 'CREATE_CHAT',
        id: chatId,
        memberIds: [anna.userId],
      }),
    ]);
    // the chat the user is looking at stays usable while the creation waits in the outbox
    expect(cache.details.get(chatId)).toBeDefined();
    expect(cache.chats?.[0]?.id).toBe(chatId);
  });

  test('discards the optimistic chat and leaves it when the creation fails for good', () => {
    const { cache, createChat, latestOptions, rerender } = renderCreateChat();

    const chatId = createChat({ chatName: undefined, members: [anna] });
    mockPathname.current = `/app/chat/${chatId}`;
    rerender();

    latestOptions().onError(
      { message: 'FORBIDDEN' },
      { chatId, chatName: undefined, members: [{ userId: anna.userId }] },
    );

    expect(cache.chats).toEqual([]);
    expect(cache.details.get(chatId)).toBeUndefined();
    expect(cache.messagePages.get(chatId)).toBeUndefined();
    expect(mockRouterReplace).toHaveBeenCalledWith('/app/chat');
  });

  test('follows the existing chat when the server dedupes a one-to-one creation', () => {
    const { cache, createChat, latestOptions, rerender } = renderCreateChat();

    const chatId = createChat({ chatName: undefined, members: [anna] });
    mockPathname.current = `/app/chat/${chatId}`;
    rerender();

    latestOptions().onSuccess('existing-chat-id', {
      chatId,
      chatName: undefined,
      members: [{ userId: anna.userId }],
    });

    expect(cache.chats).toEqual([]);
    expect(cache.details.get(chatId)).toBeUndefined();
    expect(mockRouterReplace).toHaveBeenCalledWith('/app/chat/existing-chat-id');
  });

  test('keeps the opened chat when the server stored it under the requested id', () => {
    const { cache, createChat, latestOptions, rerender } = renderCreateChat();

    const chatId = createChat({ chatName: undefined, members: [anna] });
    mockPathname.current = `/app/chat/${chatId}`;
    rerender();

    latestOptions().onSuccess(chatId, {
      chatId,
      chatName: undefined,
      members: [{ userId: anna.userId }],
    });

    expect(cache.chats?.[0]?.id).toBe(chatId);
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });
});
