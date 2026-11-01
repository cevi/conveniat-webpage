import type { Context } from '@/trpc/init';
import { createCallerFactory, createTRPCRouter } from '@/trpc/init';

jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));
jest.mock('@/config/environment-variables', () => ({ environmentVariables: {} }));
jest.mock('@/utils/get-locale-from-cookies', () => ({
  getLocaleFromCookies: jest.fn().mockResolvedValue('de'),
}));
jest.mock('superjson', () => ({
  __esModule: true,
  default: {
    serialize: (value: unknown): { json: unknown } => ({ json: value }),
    deserialize: (value: { json: unknown }): unknown => value.json,
  },
}));
jest.mock('payload', () => ({
  getPayload: jest.fn().mockResolvedValue({
    find: (): Promise<{ docs: unknown[] }> => Promise.resolve({ docs: [] }),
  }),
}));

import { getChatList } from '@/features/chat/api/queries/list-chats';

const READER = 'anna';

interface ChatSetup {
  id: string;
  /** minutes since the start of the test day, the newest chat comes first in the list */
  lastUpdate: number;
  pinnedForEveryone?: boolean;
  /** minutes since the start of the test day the reader pinned it */
  pinnedAt?: number;
  muted?: boolean;
  markedUnread?: boolean;
  unreadMessages?: number;
}

const at = (minutes: number): Date => new Date(Date.UTC(2027, 6, 24, 8, minutes));

/**
 * Postgres holding the reader's memberships of `chats`, handed back newest chat first the way
 * the query orders them.
 */
const prismaWith = (chats: ChatSetup[]): Record<string, unknown> => ({
  user: { findUnique: jest.fn().mockResolvedValue({ uuid: READER }) },
  chatMembership: {
    findMany: ({ where }: { where: { userId?: string } }): Promise<unknown[]> => {
      if (where.userId !== READER) return Promise.resolve([]);
      return Promise.resolve(
        chats
          .toSorted((a, b) => b.lastUpdate - a.lastUpdate)
          .map((chat) => ({
            /* eslint-disable unicorn/no-null -- what Postgres answers for an unset column */
            lastReadMessageId: null,
            chatPermission: 'MEMBER',
            pinnedAt: chat.pinnedAt === undefined ? null : at(chat.pinnedAt),
            mutedAt: chat.muted === true ? at(0) : null,
            markedUnread: chat.markedUnread === true,
            chat: {
              uuid: chat.id,
              name: chat.id,
              description: null,
              type: 'GROUP',
              status: 'OPEN',
              caseNumber: null,
              archivedAt: null,
              lastUpdate: at(chat.lastUpdate),
              pinned: chat.pinnedForEveryone === true,
              messages: [],
              _count: { messages: 0, chatMemberships: 3 },
            },
            /* eslint-enable unicorn/no-null */
          })),
      );
    },
  },
  message: {
    findMany: jest.fn().mockResolvedValue([]),
    groupBy: jest
      .fn()
      .mockResolvedValue(
        chats
          .filter((chat) => (chat.unreadMessages ?? 0) > 0)
          .map((chat) => ({ chatId: chat.id, _count: { uuid: chat.unreadMessages } })),
      ),
  },
});

const createCaller = createCallerFactory(createTRPCRouter({ getChatList }));
const listOf = (chats: ChatSetup[]): ReturnType<ReturnType<typeof createCaller>['getChatList']> =>
  createCaller({
    user: { uuid: READER, group_ids: [], name: 'Anna', email: 'anna@example.test' },
    prisma: prismaWith(chats),
    locale: 'de',
  } as unknown as Context).getChatList({});

describe('the chat list with the reader’s own settings', () => {
  it('puts the chats pinned for everyone first, then the own pins by the latest pin', async () => {
    const chats = await listOf([
      { id: 'newest', lastUpdate: 50 },
      { id: 'infos-gesamtlager', lastUpdate: 10, pinnedForEveryone: true },
      { id: 'pinned-first', lastUpdate: 40, pinnedAt: 1 },
      { id: 'pinned-last', lastUpdate: 20, pinnedAt: 5 },
      { id: 'oldest', lastUpdate: 0 },
    ]);

    expect(chats.map((chat) => chat.id)).toEqual([
      'infos-gesamtlager',
      'pinned-last',
      'pinned-first',
      'newest',
      'oldest',
    ]);
  });

  it('tells the own pin apart from the pin for everyone', async () => {
    const chats = await listOf([
      { id: 'infos-gesamtlager', lastUpdate: 10, pinnedForEveryone: true },
      { id: 'cevi-uster', lastUpdate: 20, pinnedAt: 5 },
      { id: 'zueri-11', lastUpdate: 30 },
    ]);

    expect(
      chats.map(({ id, isPinned, isPinnedByMe, isPinnedForEveryone }) => ({
        id,
        isPinned,
        isPinnedByMe,
        isPinnedForEveryone,
      })),
    ).toEqual([
      { id: 'infos-gesamtlager', isPinned: true, isPinnedByMe: false, isPinnedForEveryone: true },
      { id: 'cevi-uster', isPinned: true, isPinnedByMe: true, isPinnedForEveryone: false },
      { id: 'zueri-11', isPinned: false, isPinnedByMe: false, isPinnedForEveryone: false },
    ]);
  });

  it('answers muted and marked unread as booleans for every chat', async () => {
    const chats = await listOf([
      { id: 'cevi-uster', lastUpdate: 20, muted: true, markedUnread: true },
      { id: 'zueri-11', lastUpdate: 10 },
    ]);

    expect(
      chats.map(({ id, isMuted, isMarkedUnread }) => ({ id, isMuted, isMarkedUnread })),
    ).toEqual([
      { id: 'cevi-uster', isMuted: true, isMarkedUnread: true },
      { id: 'zueri-11', isMuted: false, isMarkedUnread: false },
    ]);
  });

  it('counts a chat marked unread as one unread message, unless it has more', async () => {
    const chats = await listOf([
      { id: 'read', lastUpdate: 30, markedUnread: true },
      { id: 'with-unread', lastUpdate: 20, markedUnread: true, unreadMessages: 4 },
      { id: 'untouched', lastUpdate: 10 },
    ]);

    expect(chats.map(({ id, unreadCount }) => ({ id, unreadCount }))).toEqual([
      { id: 'read', unreadCount: 1 },
      { id: 'with-unread', unreadCount: 4 },
      { id: 'untouched', unreadCount: 0 },
    ]);
  });
});
