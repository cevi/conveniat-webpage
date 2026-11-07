/**
 * @jest-environment jsdom
 */

import type { Contact } from '@/features/chat/api/queries/list-contacts';
import { CHAT_PAGE_SIZE } from '@/features/chat/constants';
import { useCreateChat } from '@/features/chat/hooks/use-create-chat';
import { getOfflineOutbox } from '@/features/chat/utils/offline-outbox';
import type { TestTrpc } from '@/trpc/test-trpc';
import { createTestTrpc, testTrpcError } from '@/trpc/test-trpc';
import { act, renderHook, waitFor } from '@testing-library/react';
import { TRPCClientError } from '@trpc/client';

// the generated prisma client cannot be loaded under jsdom; the hook only needs its enums

jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);

jest.mock('@/components/ui/toast', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('@/hooks/use-current-locale', () => ({
  useCurrentLocale: (): string => 'de',
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

/** The server's answer to `chat.createChat`, settled by the test once it has set the scene. */
interface PendingCreation {
  resolve: (createdChatId: string) => void;
  reject: (error: unknown) => void;
}

/** `overviewLoaded: false` opens the form without the chat overview ever having loaded */
const renderCreateChat = async ({ overviewLoaded = true } = {}): Promise<
  TestTrpc & {
    createChat: ReturnType<typeof useCreateChat>['createChat'];
    createChatHandler: jest.Mock;
    /** the creation that reached the server last */
    pendingCreation: () => PendingCreation;
    chats: () => { id: string }[] | undefined;
    details: (chatId: string) => { participants: { id: string }[] } | undefined;
    messages: (chatId: string) => { pages: { items: unknown[] }[] } | undefined;
    rerender: () => void;
  }
> => {
  let pending: PendingCreation | undefined;
  const createChatHandler = jest.fn(
    () =>
      new Promise((resolve, reject) => {
        pending = { resolve, reject };
      }),
  );
  const testTrpc = createTestTrpc({
    'chat.user': () => CURRENT_USER_ID,
    'chat.createChat': createChatHandler,
  });
  const { trpc, queryClient, wrapper } = testTrpc;
  if (overviewLoaded) queryClient.setQueryData(trpc.chat.chats.queryKey({}), []);

  const { result, rerender } = renderHook(() => useCreateChat(), { wrapper });
  await waitFor(() =>
    expect(queryClient.getQueryData(trpc.chat.user.queryKey({}))).toBe(CURRENT_USER_ID),
  );

  return {
    ...testTrpc,
    createChat: (arguments_) => result.current.createChat(arguments_),
    createChatHandler,
    pendingCreation: (): PendingCreation => {
      if (!pending) throw new Error('chat.createChat never reached the server');
      return pending;
    },
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
    rerender: (): void => rerender(),
  };
};

/** creates a one-to-one chat with Anna and waits until the creation reached the server */
const createChatWithAnna = async (
  rendered: Awaited<ReturnType<typeof renderCreateChat>>,
): Promise<string> => {
  let chatId = '';
  act(() => {
    chatId = rendered.createChat({ chatName: undefined, members: [anna] });
  });
  await waitFor(() => expect(rendered.createChatHandler).toHaveBeenCalled());
  return chatId;
};

describe('useCreateChat', () => {
  beforeEach(() => {
    localStorage.clear();
    mockRouterReplace.mockClear();
    mockPathname.current = '/app/chat/new';
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  test('creates the chat under a client-generated id the server is asked to adopt', async () => {
    const rendered = await renderCreateChat();

    const chatId = await createChatWithAnna(rendered);

    expect(rendered.createChatHandler).toHaveBeenCalledWith({
      chatId,
      chatName: undefined,
      members: [{ userId: anna.userId }],
    });
  });

  test('seeds the chat view so the new chat can be opened right away', async () => {
    const rendered = await renderCreateChat();

    const chatId = await createChatWithAnna(rendered);

    // overview entry
    expect(rendered.chats()?.[0]).toMatchObject({ id: chatId, name: anna.name, unreadCount: 0 });

    // chat details, including the current user, so a group header counts everyone
    const details = rendered.details(chatId);
    expect(details).toMatchObject({ id: chatId, name: anna.name, type: 'ONE_TO_ONE' });
    expect(details?.participants.map((participant) => participant.id)).toEqual([
      CURRENT_USER_ID,
      anna.userId,
    ]);

    // first page of messages, holding the "chat created" system message
    expect(rendered.messages(chatId)?.pages[0]?.items).toHaveLength(1);
    expect(rendered.messages(chatId)?.pages[0]?.items[0]).toMatchObject({
      type: 'SYSTEM_MSG',
    });
  });

  test('leaves an overview that was never loaded for the server to fill', async () => {
    const rendered = await renderCreateChat({ overviewLoaded: false });

    const chatId = await createChatWithAnna(rendered);

    expect(rendered.chats()).toBeUndefined();
    // the chat itself still opens right away
    expect(rendered.details(chatId)).toMatchObject({ id: chatId });
  });

  test('names a group chat after the entered group name', async () => {
    const rendered = await renderCreateChat();

    let chatId = '';
    act(() => {
      chatId = rendered.createChat({ chatName: 'Küchenteam', members: [anna, bruno] });
    });

    expect(rendered.chats()?.[0]).toMatchObject({
      id: chatId,
      name: 'Küchenteam',
      chatType: 'GROUP',
    });
    expect(rendered.details(chatId)?.participants).toHaveLength(3);
  });

  test('queues the creation under the same id when offline, keeping the open chat intact', async () => {
    const rendered = await renderCreateChat();

    const chatId = await createChatWithAnna(rendered);
    await act(async () => {
      rendered.pendingCreation().reject(new TRPCClientError('Failed to fetch'));
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(getOfflineOutbox()).toEqual([
        expect.objectContaining({
          type: 'CREATE_CHAT',
          id: chatId,
          memberIds: [anna.userId],
        }),
      ]),
    );
    // the chat the user is looking at stays usable while the creation waits in the outbox
    expect(rendered.details(chatId)).toBeDefined();
    expect(rendered.chats()?.[0]?.id).toBe(chatId);
  });

  test('discards the optimistic chat and leaves it when the creation fails for good', async () => {
    const rendered = await renderCreateChat();

    const chatId = await createChatWithAnna(rendered);
    mockPathname.current = `/app/chat/${chatId}`;
    rendered.rerender();

    await act(async () => {
      rendered
        .pendingCreation()
        .reject(testTrpcError('FORBIDDEN', { httpStatus: 403, path: 'chat.createChat' }));
      await Promise.resolve();
    });

    await waitFor(() => expect(mockRouterReplace).toHaveBeenCalledWith('/app/chat'));
    expect(rendered.chats()).toEqual([]);
    expect(rendered.details(chatId)).toBeUndefined();
    expect(rendered.messages(chatId)).toBeUndefined();
  });

  test('follows the existing chat when the server dedupes a one-to-one creation', async () => {
    const rendered = await renderCreateChat();

    const chatId = await createChatWithAnna(rendered);
    mockPathname.current = `/app/chat/${chatId}`;
    rendered.rerender();

    await act(async () => {
      rendered.pendingCreation().resolve('existing-chat-id');
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(mockRouterReplace).toHaveBeenCalledWith('/app/chat/existing-chat-id'),
    );
    expect(rendered.chats()).toEqual([]);
    expect(rendered.details(chatId)).toBeUndefined();
  });

  test('keeps the opened chat when the server stored it under the requested id', async () => {
    const rendered = await renderCreateChat();

    const chatId = await createChatWithAnna(rendered);
    mockPathname.current = `/app/chat/${chatId}`;
    rendered.rerender();

    await act(async () => {
      rendered.pendingCreation().resolve(chatId);
      await Promise.resolve();
    });

    // the overview and the chat refetch the server's version; nothing is discarded meanwhile
    await waitFor(() =>
      expect(
        rendered.queryClient.getQueryState(rendered.trpc.chat.chatDetails.queryKey({ chatId }))
          ?.isInvalidated,
      ).toBe(true),
    );
    expect(rendered.chats()?.[0]?.id).toBe(chatId);
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });
});
