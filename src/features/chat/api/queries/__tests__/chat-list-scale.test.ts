import type { Context } from '@/trpc/init';
import { createCallerFactory, createTRPCRouter } from '@/trpc/init';

jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [],
    CEVIDB_GROUP_WEB_CORE_TEAM: [],
    CEVIDB_GROUP_TRANSLATION_TEAM: [],
    CEVIDB_GROUP_PROGRAM_TEAM: [],
  },
}));
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

const cmsUserId = (index: number): string => `user-${String(index).padStart(4, '0')}`;

/** 1500 Payload users, answered like the local API: 10 per page unless told otherwise. */
const cmsUsers = Array.from({ length: 1500 }, (_, index) => ({
  id: cmsUserId(index),
  fullName: `Vorname${index} Nachname${index}`,
  nickname: undefined,
}));

jest.mock('payload', () => ({
  getPayload: jest.fn().mockResolvedValue({
    find: ({
      where,
      limit = 10,
      pagination = true,
    }: {
      where?: { id?: { in?: string[] } };
      limit?: number;
      pagination?: boolean;
    }): Promise<{ docs: typeof cmsUsers }> => {
      const ids = where?.id?.in;
      const matching = ids === undefined ? cmsUsers : cmsUsers.filter((u) => ids.includes(u.id));
      return Promise.resolve({ docs: pagination ? matching.slice(0, limit) : matching });
    },
  }),
}));

import { getChat } from '@/features/chat/api/queries/get-chat';
import { getChatList } from '@/features/chat/api/queries/list-chats';

const ONE_TO_ONE_ID = '0190a5b2-0000-7000-8000-000000000001';
const ANNOUNCEMENT_ID = '0190a5b2-0000-7000-8000-000000000002';

const caller = { uuid: cmsUserId(0), group_ids: [], name: 'Anna', email: 'a@example.test' };
/** past the first 1000 users Payload hands out */
const partnerId = cmsUserId(1200);

const prismaUser = (uuid: string): Record<string, unknown> => ({
  uuid,
  name: `cevidb-${uuid}`,
  description: undefined,
  lastSeen: new Date(0),
  profilePictureVersion: undefined,
});

const message = {
  uuid: 'message-1',
  createdAt: new Date(0),
  senderId: partnerId,
  sender: { name: 'Partner' },
  type: 'TEXT_MSG',
  parentId: undefined,
  messageEvents: [],
  contentVersions: [{ payload: { text: 'hallo' } }],
};

const chatRow = (uuid: string, type: string, memberCount: number): Record<string, unknown> => ({
  uuid,
  name: type === 'ANNOUNCEMENT' ? 'Infos Gesamtlager' : '',
  description: undefined,
  type,
  status: 'OPEN',
  caseNumber: undefined,
  courseId: undefined,
  /* eslint-disable unicorn/no-null -- what Postgres answers for an open, unread chat */
  archivedAt: null,
  adminReadAt: null,
  /* eslint-enable unicorn/no-null */
  lastUpdate: new Date(0),
  pinned: false,
  capabilities: [],
  messages: [message],
  _count: { messages: 1, chatMemberships: memberCount },
});

interface Membership {
  userId: string;
  chatId: string;
  chatPermission: string;
  lastReadMessageId: string | undefined;
}

/**
 * Postgres for one one-to-one chat and one announcement with `announcementSize` members,
 * counting every membership row a query hands back.
 */
const createPrisma = (
  announcementSize: number,
): { prisma: Record<string, unknown>; membershipRowsRead: () => number } => {
  const chats = new Map([
    [ONE_TO_ONE_ID, chatRow(ONE_TO_ONE_ID, 'ONE_TO_ONE', 2)],
    [ANNOUNCEMENT_ID, chatRow(ANNOUNCEMENT_ID, 'ANNOUNCEMENT', announcementSize)],
  ]);
  const membership = (userId: string, chatId: string): Membership => ({
    userId,
    chatId,
    chatPermission: 'MEMBER',
    lastReadMessageId: undefined,
  });
  const memberships: Membership[] = [
    membership(caller.uuid, ONE_TO_ONE_ID),
    membership(partnerId, ONE_TO_ONE_ID),
    ...Array.from({ length: announcementSize }, (_, index) =>
      membership(cmsUserId(index), ANNOUNCEMENT_ID),
    ),
  ];

  let rowsRead = 0;
  const read = <T>(rows: T[]): Promise<T[]> => {
    rowsRead += rows.length;
    return Promise.resolve(rows);
  };

  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue({ uuid: caller.uuid }) },
    chat: {
      findUnique: ({
        where,
        include,
      }: {
        where: { uuid: string };
        include: { chatMemberships: { where: { userId: string } } };
      }): Promise<Record<string, unknown>> => {
        const own = memberships.filter(
          (m) => m.chatId === where.uuid && m.userId === include.chatMemberships.where.userId,
        );
        rowsRead += own.length;
        return Promise.resolve({
          ...chats.get(where.uuid),
          chatMemberships: own.map((m) => ({ ...m, user: prismaUser(m.userId) })),
        });
      },
    },
    chatMembership: {
      findMany: ({
        where,
      }: {
        where: { userId?: string; chatId?: string | { in: string[] } };
      }): Promise<unknown[]> => {
        if (typeof where.userId === 'string') {
          const own = memberships.filter((m) => m.userId === where.userId);
          return read(own.map((m) => ({ ...m, chat: chats.get(m.chatId) })));
        }
        const chatIds = typeof where.chatId === 'string' ? [where.chatId] : where.chatId?.in;
        const members = memberships.filter(
          (m) => chatIds?.includes(m.chatId) === true && m.userId !== caller.uuid,
        );
        return read(members.map((m) => ({ ...m, user: prismaUser(m.userId) })));
      },
    },
    message: {
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
    },
  };

  return { prisma, membershipRowsRead: () => rowsRead };
};

const createCaller = createCallerFactory(createTRPCRouter({ getChat, getChatList }));

const callerWith = (prisma: Record<string, unknown>): ReturnType<typeof createCaller> =>
  createCaller({ user: caller, prisma, locale: 'de' } as unknown as Context);

describe('chat list and chat details at camp scale', () => {
  it('reads as many membership rows for an announcement to 3000 as for one to 3', async () => {
    const small = createPrisma(3);
    const large = createPrisma(3000);

    await callerWith(small.prisma).getChatList({});
    await callerWith(large.prisma).getChatList({});

    expect(large.membershipRowsRead()).toBe(small.membershipRowsRead());
  });

  it('caps the unread count of an announcement to 3000 at 1 and marks it large', async () => {
    const { prisma } = createPrisma(3000);
    (prisma['message'] as { groupBy: jest.Mock }).groupBy.mockResolvedValueOnce([
      { chatId: ANNOUNCEMENT_ID, _count: { uuid: 5 } },
    ]);

    const chats = await callerWith(prisma).getChatList({});

    expect(chats.find((c) => c.id === ANNOUNCEMENT_ID)).toMatchObject({
      unreadCount: 1,
      isLarge: true,
    });
  });

  it('names a one-to-one chat after a partner beyond the first 1000 users', async () => {
    const { prisma } = createPrisma(3);

    const chats = await callerWith(prisma).getChatList({});

    expect(chats.find((c) => c.id === ONE_TO_ONE_ID)?.name).toBe('Vorname1200 Nachname1200');
  });

  it('names the open one-to-one chat after that partner too', async () => {
    const { prisma } = createPrisma(3);

    const details = await callerWith(prisma).getChat({ chatId: ONE_TO_ONE_ID });

    expect(details.name).toBe('Vorname1200 Nachname1200');
  });

  it('shows the members of an announcement only themselves, without reading the others', async () => {
    const { prisma, membershipRowsRead } = createPrisma(3000);

    const details = await callerWith(prisma).getChat({ chatId: ANNOUNCEMENT_ID });

    expect(details.participants.map((p) => p.id)).toEqual([caller.uuid]);
    expect(membershipRowsRead()).toBe(1);
  });
});
