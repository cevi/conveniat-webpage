import type { Context } from '@/trpc/init';
import { createCallerFactory, createTRPCRouter } from '@/trpc/init';

jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('payload', () => ({ getPayload: jest.fn() }));
jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    // the groups the forum's rights read, none of them held here
    CEVIDB_GROUP_FULL_ADMIN: [],
    CEVIDB_GROUP_WEB_CORE_TEAM: [],
    CEVIDB_GROUP_FORUM_ZENTRALE: [],
    CEVIDB_GROUP_HELPER_POOL: [],
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
// Lea is on forum piket duty
jest.mock('@/features/chat/api/utils/piket-service', () => ({
  findActivePiketShift: (userId: string): Promise<unknown> =>
    Promise.resolve(
      userId === 'lea'
        ? { scheduleId: 'shift', start: new Date(0), end: new Date(8.64e15) }
        : undefined,
    ),
  getActivePiketMembers: (): Promise<unknown[]> => Promise.resolve([{ id: 'lea', name: 'Lea' }]),
}));

// Mira holds "Ressortleitung Infrastruktur", one of the topic's Kernteam functions
jest.mock('@/features/chat/api/forum/forum-kernteam-labels', () => ({
  findKernteamLabelsOfTopic: (
    _prisma: unknown,
    _chatId: string,
    userIds: Iterable<string>,
  ): Promise<Map<string, string>> =>
    Promise.resolve(
      new Map(
        [...userIds]
          .filter((id) => id === 'mira')
          .map((id) => [id, 'Ressortleitung Infrastruktur'] as const),
      ),
    ),
}));

import { markThreadAsRead } from '@/features/chat/api/mutations/mark-thread-as-read';
import { getChatMessages } from '@/features/chat/api/queries/get-chat-messages';
import { getMessage } from '@/features/chat/api/queries/get-message';
import { ChatMembershipPermission, ChatType } from '@/lib/prisma/enums';

const TOPIC = '0193f1a0-0000-7000-8000-000000000001';
const REPORT = '0193f1a0-0000-7000-8000-0000000000aa';
const COMMENT = '0193f1a0-0000-7000-8000-0000000000bb';

/** Why only some see the post: it waits for approval, or a moderator or flags hid it. */
let restriction: 'held' | 'hidden';
let readEvents: { messageId: string; userId: string }[];

/**
 * Noah wrote the restricted post, Lea is on piket duty, Sina is only a member of the topic, Mira
 * is its Kernteam.
 */
const memberships = [
  { userId: 'mira', chatPermission: ChatMembershipPermission.ADMIN },
  { userId: 'noah', chatPermission: ChatMembershipPermission.MEMBER },
  { userId: 'lea', chatPermission: ChatMembershipPermission.MEMBER },
  { userId: 'sina', chatPermission: ChatMembershipPermission.MEMBER },
];

const comment = {
  uuid: COMMENT,
  chatId: TOPIC,
  chat: { type: ChatType.FORUM },
  parentId: REPORT,
  createdAt: new Date(0),
  senderId: 'lea',
  sender: { name: 'Lea' },
  type: 'TEXT_MSG',
  messageEvents: [],
  contentVersions: [{ payload: { text: 'Wir melden uns bei dir.' } }],
  reactions: [],
  replies: [],
  _count: { replies: 0 },
};

const kernteamComment = {
  ...comment,
  uuid: '0193f1a0-0000-7000-8000-0000000000cc',
  senderId: 'mira',
  sender: { name: 'Mira v/o Pfau' },
  contentVersions: [{ payload: { text: 'Die Pumpe wird heute um 16 Uhr ersetzt.' } }],
};

const prisma = {
  chat: {
    findUnique: ({
      include,
    }: {
      include?: { chatMemberships: { where: { userId: string } } };
    }): Promise<unknown> =>
      Promise.resolve({
        uuid: TOPIC,
        type: ChatType.FORUM,
        chatMemberships: memberships.filter(
          (m) => m.userId === include?.chatMemberships.where.userId,
        ),
      }),
  },
  chatMembership: {
    findUnique: ({ where }: { where: { userId_chatId: { userId: string } } }): Promise<unknown> => {
      const membership = memberships.find((m) => m.userId === where.userId_chatId.userId);
      return Promise.resolve(
        membership === undefined ? null : { ...membership, chat: { type: ChatType.FORUM } },
      );
    },
    findMany: ({
      where,
    }: {
      where: { userId: { in: string[] }; chatPermission: { in: string[] } };
    }): Promise<unknown[]> =>
      Promise.resolve(
        memberships.filter(
          (m) =>
            where.userId.in.includes(m.userId) &&
            where.chatPermission.in.includes(m.chatPermission),
        ),
      ),
  },
  forumPost: {
    findUnique: ({ where }: { where: { messageId: string } }): Promise<unknown> =>
      Promise.resolve(
        where.messageId === REPORT
          ? {
              messageId: REPORT,
              chatId: TOPIC,
              approvedAt: restriction === 'held' ? null : new Date(0),
              message: {
                senderId: 'noah',
                forumRemoval: restriction === 'hidden' ? { kind: 'HIDDEN' } : null,
              },
            }
          : null,
      ),
  },
  forumPostAssignment: { findFirst: (): Promise<null> => Promise.resolve(null) },
  // only the post itself is hidden, its comments are not
  forumRemoval: { findMany: (): Promise<unknown[]> => Promise.resolve([]) },
  forumFlag: { findMany: (): Promise<unknown[]> => Promise.resolve([]) },
  messageEvent: {
    createMany: ({
      data,
    }: {
      data: { messageId: string; userId: string }[];
    }): Promise<{ count: number }> => {
      readEvents.push(...data);
      return Promise.resolve({ count: data.length });
    },
  },
  message: {
    findUnique: ({ where }: { where: { uuid: string } }): Promise<unknown> =>
      Promise.resolve(
        where.uuid === REPORT
          ? { uuid: REPORT, chatId: TOPIC, senderId: 'noah', parentId: null }
          : { uuid: COMMENT, chatId: TOPIC, senderId: 'lea', parentId: REPORT },
      ),
    findMany: (): Promise<unknown[]> => Promise.resolve([kernteamComment, comment]),
    findFirst: (): Promise<unknown> => Promise.resolve(comment),
    // the thread summaries of the comments, which have no replies of their own
    groupBy: (): Promise<unknown[]> => Promise.resolve([]),
  },
};

const createCaller = createCallerFactory(
  createTRPCRouter({ getChatMessages, getMessage, markThreadAsRead }),
);
const as = (uuid: string): ReturnType<typeof createCaller> =>
  createCaller({
    user: { uuid, group_ids: [], name: uuid, email: `${uuid}@example.test` },
    prisma,
    locale: 'de',
  } as unknown as Context);

beforeEach(() => {
  restriction = 'held';
  readEvents = [];
});

describe.each([
  ['waiting for approval', 'held'],
  ['hidden', 'hidden'],
] as const)('the thread of a post %s', (_, kind) => {
  beforeEach(() => {
    restriction = kind;
  });

  it('is read by its author and by the piket on duty', async () => {
    for (const reader of ['noah', 'lea']) {
      const { items } = await as(reader).getChatMessages({ chatId: TOPIC, parentId: REPORT });
      expect(items.map((item) => item.id)).toContain(COMMENT);
    }
  });

  it('does not exist for another member of the topic', async () => {
    await expect(
      as('sina').getChatMessages({ chatId: TOPIC, parentId: REPORT }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(as('sina').getMessage({ messageId: COMMENT })).resolves.toBeUndefined();
  });

  it('cannot be marked read by another member, as if it did not exist', async () => {
    await expect(
      as('sina').markThreadAsRead({ chatId: TOPIC, threadId: REPORT }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(readEvents).toEqual([]);

    await as('noah').markThreadAsRead({ chatId: TOPIC, threadId: REPORT });
    expect(readEvents.map((event) => event.userId)).toContain('noah');
  });
});

describe('the comments of a forum thread', () => {
  it("mark what the topic's Kernteam wrote, with the function behind it", async () => {
    const { items } = await as('noah').getChatMessages({ chatId: TOPIC, parentId: REPORT });

    expect(
      items.map((item) => [item.senderId, item.byTopicAdmin === true, item.kernteamLabel]),
    ).toEqual([
      ['mira', true, 'Ressortleitung Infrastruktur'],
      ['lea', false, undefined],
    ]);
  });
});
