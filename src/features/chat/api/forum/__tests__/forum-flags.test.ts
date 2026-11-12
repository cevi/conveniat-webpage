import type { Context } from '@/trpc/init';
import { createCallerFactory, createTRPCRouter } from '@/trpc/init';

jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('payload', () => ({ getPayload: jest.fn() }));
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    // the groups the forum's rights read, none of them held here
    CEVIDB_GROUP_FULL_ADMIN: [],
    CEVIDB_GROUP_WEB_CORE_TEAM: [],
    CEVIDB_GROUP_FORUM_ZENTRALE: [],
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
// the pushes read on the pool after the commit; it sees the same tables
jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  get default(): unknown {
    return prisma;
  },
}));
jest.mock('@/lib/read-feature-flags', () => ({
  readFeatureFlag: (): Promise<boolean> => Promise.resolve(true),
}));
jest.mock('@/lib/db/redis', () => ({
  redis: { eval: (): Promise<number> => Promise.resolve(1) },
}));
jest.mock('@/lib/db/chat-pubsub', () => ({
  chatPubSub: { publish: (): Promise<void> => Promise.resolve() },
}));
const shifts = new Map<string, { scheduleId: string; start: Date; end: Date }>();
jest.mock('@/features/chat/api/utils/piket-service', () => ({
  findActivePiketShift: (userId: string): Promise<unknown> => Promise.resolve(shifts.get(userId)),
  getActivePiketMembers: (): Promise<unknown[]> =>
    Promise.resolve([...shifts.keys()].map((id) => ({ id, name: id }))),
}));
jest.mock('@/lib/push/send-notification', () => ({
  sendNotification: (): Promise<unknown> => Promise.resolve({}),
}));

import { createForumFlag, removeForumMessage } from '@/features/chat/api/forum/forum-moderation';
import { ChatMembershipPermission, ChatType } from '@/lib/prisma/enums';

const TOPIC = '0193f1a0-0000-7000-8000-000000000001';
const POST = '0193f1a0-0000-7000-8000-0000000000aa';

interface Flag {
  messageId: string;
  userId: string;
  resolvedAt: Date | null;
  reason: string;
}

/** Mira is the topic's Kernteam; Noah wrote the post; the others only read the topic. */
const memberships: Record<string, ChatMembershipPermission> = {
  mira: ChatMembershipPermission.ADMIN,
  noah: ChatMembershipPermission.MEMBER,
  sina: ChatMembershipPermission.MEMBER,
  tim: ChatMembershipPermission.MEMBER,
  lou: ChatMembershipPermission.MEMBER,
};
let flags: Flag[];
let removals: Map<string, Record<string, unknown>>;
let audit: Record<string, unknown>[];

const prisma = {
  $transaction: <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => callback(prisma),
  $executeRaw: (): Promise<number> => Promise.resolve(0),
  chat: { findUnique: (): Promise<unknown> => Promise.resolve({ type: ChatType.FORUM }) },
  message: {
    findUnique: (): Promise<unknown> =>
      Promise.resolve({
        uuid: POST,
        chatId: TOPIC,
        type: 'TEXT_MSG',
        parentId: null,
        createdAt: new Date(),
        deletedAt: null,
        senderId: 'noah',
        sender: { name: 'Noah v/o Biber' },
        contentVersions: [{ payload: { text: 'Toitoi in der Mitte ist voll', images: [] } }],
      }),
  },
  forumPost: {
    // one row for every select the moderation asks for
    findUnique: (): Promise<unknown> =>
      Promise.resolve({
        messageId: POST,
        chatId: TOPIC,
        title: 'Toitoi in der Mitte ist voll',
        status: 'OPEN',
        statusChangedById: null,
        mergedIntoId: null,
        pinnedAt: null,
        answerMessageId: null,
        approvedAt: new Date(),
        chat: { name: 'Platz & Infrastruktur', type: ChatType.FORUM },
        message: {
          senderId: 'noah',
          deletedAt: null,
          forumRemoval: removals.has(POST) ? { kind: removals.get(POST)?.['kind'] } : null,
        },
      }),
  },
  chatMembership: {
    count: ({ where }: { where: { userId: string } }): Promise<number> =>
      Promise.resolve(where.userId in memberships ? 1 : 0),
    findUnique: ({ where }: { where: { userId_chatId: { userId: string } } }): Promise<unknown> => {
      const permission = memberships[where.userId_chatId.userId];
      return Promise.resolve(
        permission === undefined
          ? null
          : { chatPermission: permission, chat: { type: ChatType.FORUM } },
      );
    },
    findMany: (): Promise<unknown[]> => Promise.resolve([{ userId: 'mira' }]),
  },
  forumPostAssignment: {
    findFirst: (): Promise<null> => Promise.resolve(null),
    findMany: (): Promise<unknown[]> => Promise.resolve([]),
  },
  forumFlag: {
    findUnique: ({
      where,
    }: {
      where: { messageId_userId: { messageId: string; userId: string } };
    }): Promise<unknown> =>
      Promise.resolve(
        flags.find(
          (flag) =>
            flag.messageId === where.messageId_userId.messageId &&
            flag.userId === where.messageId_userId.userId,
        ) ?? null,
      ),
    upsert: ({
      create,
    }: {
      create: { messageId: string; userId: string; reason: string };
    }): Promise<void> => {
      flags.push({ ...create, resolvedAt: null });
      return Promise.resolve();
    },
    findMany: ({ where }: { where: { messageId: string } }): Promise<unknown[]> =>
      Promise.resolve(
        flags.filter((flag) => flag.messageId === where.messageId && flag.resolvedAt === null),
      ),
    updateMany: ({ where }: { where: { messageId: string } }): Promise<void> => {
      for (const flag of flags) {
        if (flag.messageId === where.messageId) flag.resolvedAt = new Date();
      }
      return Promise.resolve();
    },
  },
  forumRemoval: {
    count: ({ where }: { where: { messageId: string } }): Promise<number> =>
      Promise.resolve(removals.has(where.messageId) ? 1 : 0),
    findUnique: ({ where }: { where: { messageId: string } }): Promise<unknown> =>
      Promise.resolve(removals.get(where.messageId) ?? null),
    upsert: ({
      create,
    }: {
      create: { messageId: string } & Record<string, unknown>;
    }): Promise<void> => {
      removals.set(create.messageId, create);
      return Promise.resolve();
    },
  },
  forumAuditEvent: {
    create: ({ data }: { data: Record<string, unknown> }): Promise<void> => {
      audit.push(data);
      return Promise.resolve();
    },
  },
};

const createCaller = createCallerFactory(createTRPCRouter({ createForumFlag, removeForumMessage }));
const as = (uuid: string): ReturnType<typeof createCaller> =>
  createCaller({
    user: { uuid, group_ids: [], name: `${uuid} v/o Test`, email: `${uuid}@example.test` },
    prisma,
    locale: 'de',
  } as unknown as Context);

beforeEach(() => {
  flags = [];
  removals = new Map();
  audit = [];
  shifts.clear();
});

describe('flagging a forum post', () => {
  it('hides the post once three different people flagged it, as the forum itself', async () => {
    await expect(
      as('sina').createForumFlag({ messageId: POST, reason: 'INAPPROPRIATE' }),
    ).resolves.toEqual({
      hidden: false,
    });
    await as('tim').createForumFlag({ messageId: POST, reason: 'INAPPROPRIATE' });
    expect(removals.size).toBe(0);

    await expect(
      as('lou').createForumFlag({ messageId: POST, reason: 'PERSONAL_DATA' }),
    ).resolves.toEqual({ hidden: true });

    expect(removals.get(POST)).toEqual(
      expect.objectContaining({ kind: 'HIDDEN', reason: 'INAPPROPRIATE', capacity: 'AUTOMATIC' }),
    );
    expect(audit).toEqual([expect.objectContaining({ action: 'HIDDEN', capacity: 'AUTOMATIC' })]);
  });

  it('refuses a flag on one’s own post', async () => {
    await expect(
      as('noah').createForumFlag({ messageId: POST, reason: 'INAPPROPRIATE' }),
    ).rejects.toMatchObject({ reason: 'ownMessage' });
    expect(flags).toEqual([]);
  });
});

describe('removing a forum post', () => {
  it('refuses someone who does not moderate the topic', async () => {
    await expect(
      as('sina').removeForumMessage({ messageId: POST, kind: 'HIDDEN', reason: 'INAPPROPRIATE' }),
    ).rejects.toMatchObject({ reason: 'notAllowed' });
    expect(removals.size).toBe(0);
    expect(audit).toEqual([]);
  });

  it('hides the post for its Kernteam, with the reason in the protocol', async () => {
    await as('mira').removeForumMessage({
      messageId: POST,
      kind: 'HIDDEN',
      reason: 'INAPPROPRIATE',
    });

    expect(removals.get(POST)).toEqual(
      expect.objectContaining({ kind: 'HIDDEN', reason: 'INAPPROPRIATE', capacity: 'TOPIC_ADMIN' }),
    );
    expect(audit).toEqual([expect.objectContaining({ action: 'HIDDEN', actorId: 'mira' })]);
  });
});
