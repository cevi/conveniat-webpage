import type { Context } from '@/trpc/init';
import { createCallerFactory, createTRPCRouter } from '@/trpc/init';

jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('payload', () => ({ getPayload: jest.fn() }));
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
jest.mock('@prisma/client', () =>
  jest.requireActual<typeof import('@/lib/prisma')>('@/lib/prisma'),
);
jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  get default(): unknown {
    return prisma;
  },
}));

/** the admin panel's switch, "Beiträge vor Veröffentlichung freigeben" */
let moderationRequired = false;
jest.mock('@/lib/db/redis', () => ({
  getFeatureFlag: (key: string): Promise<boolean> =>
    Promise.resolve(key === 'forum_moderation_required' ? moderationRequired : true),
  redis: { eval: (): Promise<number> => Promise.resolve(1) },
}));
const publish = jest.fn<Promise<void>, unknown[]>(() => Promise.resolve());
jest.mock('@/lib/db/chat-pubsub', () => ({
  chatPubSub: { publish: (...arguments_: unknown[]): unknown => publish(...arguments_) },
}));
jest.mock('@/lib/ability', () => ({
  Ability: { can: (): Promise<boolean> => Promise.resolve(true) },
}));
const shifts = new Map<string, { scheduleId: string; start: Date; end: Date }>();
jest.mock('@/features/chat/api/utils/piket-service', () => ({
  findActivePiketShift: (userId: string): Promise<unknown> => Promise.resolve(shifts.get(userId)),
  getActivePiketMembers: (): Promise<unknown[]> =>
    Promise.resolve([...shifts.keys()].map((id) => ({ id, name: id }))),
}));
const sendNotification = jest.fn<Promise<unknown>, unknown[]>(() => Promise.resolve({}));
jest.mock('@/lib/push/send-notification', () => ({
  sendNotification: (...arguments_: unknown[]): unknown => sendNotification(...arguments_),
}));

import { approveForumPost, createForumPost } from '@/features/chat/api/forum/forum-mutations';
import { ChatMembershipPermission, ChatType } from '@/lib/prisma';
import { getPayload } from 'payload';

const TOPIC = '0193f1a0-0000-7000-8000-000000000001';
const POST = '0193f1a0-0000-7000-8000-0000000000aa';

let memberships: {
  userId: string;
  chatPermission: ChatMembershipPermission;
  subscribed: boolean;
}[];
let posts: Map<string, { approvedAt: Date | null; approvedById?: string; private?: boolean }>;
/** the topic editors marked "Erhält private Meldungen", if any */
let privateReportTopic: string | undefined;
let audit: Record<string, unknown>[];

const membershipOf = (userId: string): (typeof memberships)[number] | undefined =>
  memberships.find((membership) => membership.userId === userId);

const prisma = {
  $transaction: <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => callback(prisma),
  $executeRaw: (): Promise<number> => Promise.resolve(0),
  chat: {
    findUnique: ({
      where,
      select,
    }: {
      where: { uuid: string };
      select: { chatMemberships?: { where: { userId: string } } };
    }): Promise<unknown> =>
      Promise.resolve({
        uuid: where.uuid,
        name: 'Platz & Infrastruktur',
        type: ChatType.FORUM,
        capabilities: [],
        status: 'OPEN',
        archivedAt: null,
        // only the caller's own membership, as the query asks for
        chatMemberships: memberships
          .filter((m) => m.userId === select.chatMemberships?.where.userId)
          .map((m) => ({ userId: m.userId, chatPermission: m.chatPermission })),
      }),
    update: (): Promise<void> => Promise.resolve(),
  },
  chatMembership: {
    upsert: ({
      create,
    }: {
      create: { userId: string; chatPermission: ChatMembershipPermission };
    }): Promise<void> => {
      if (membershipOf(create.userId) === undefined) {
        memberships.push({ ...create, subscribed: false });
      }
      return Promise.resolve();
    },
    findUnique: ({ where }: { where: { userId_chatId: { userId: string } } }): Promise<unknown> => {
      const membership = membershipOf(where.userId_chatId.userId);
      return Promise.resolve(
        membership === undefined
          ? null
          : { chatPermission: membership.chatPermission, chat: { type: ChatType.FORUM } },
      );
    },
    findMany: ({
      where,
    }: {
      where: { subscribedAt?: unknown; chatPermission?: { in: string[] } };
    }): Promise<unknown[]> =>
      Promise.resolve(
        memberships
          .filter((m) => where.subscribedAt === undefined || m.subscribed)
          .filter(
            (m) =>
              where.chatPermission === undefined ||
              where.chatPermission.in.includes(m.chatPermission),
          )
          .map((m) => ({ userId: m.userId })),
      ),
  },
  message: {
    findUnique: (): Promise<unknown> => Promise.resolve(null),
    create: ({ data }: { data: { uuid: string } }): Promise<unknown> =>
      Promise.resolve({ uuid: data.uuid, createdAt: new Date() }),
  },
  forumPost: {
    create: ({
      data,
    }: {
      data: { messageId: string; approvedAt: Date | null; private: boolean };
    }): Promise<void> => {
      posts.set(data.messageId, { approvedAt: data.approvedAt, private: data.private });
      return Promise.resolve();
    },
    findUnique: ({ where }: { where: { messageId: string } }): Promise<unknown> =>
      Promise.resolve({
        messageId: where.messageId,
        chatId: TOPIC,
        title: 'Spam? Nein, ein Problem',
        status: 'OPEN',
        statusChangedById: null,
        mergedIntoId: null,
        pinnedAt: null,
        answerMessageId: null,
        chat: { name: 'Platz & Infrastruktur', type: ChatType.FORUM },
        message: { senderId: 'noah', deletedAt: null },
      }),
    findUniqueOrThrow: ({ where }: { where: { messageId: string } }): Promise<unknown> =>
      Promise.resolve({
        approvedAt: posts.get(where.messageId)?.approvedAt ?? null,
        message: {
          createdAt: new Date(),
          sender: { name: 'Noah v/o Biber' },
          contentVersions: [{ payload: { text: 'Beschreibung', images: [] } }],
        },
      }),
    update: ({
      where,
      data,
    }: {
      where: { messageId: string };
      data: { approvedAt: Date; approvedById: string };
    }): Promise<void> => {
      posts.set(where.messageId, data);
      return Promise.resolve();
    },
  },
  forumPostAssignment: { findFirst: (): Promise<null> => Promise.resolve(null) },
  forumAuditEvent: {
    create: ({ data }: { data: Record<string, unknown> }): Promise<void> => {
      audit.push(data);
      return Promise.resolve();
    },
  },
  threadSubscription: {
    create: (): Promise<void> => Promise.resolve(),
    findMany: (): Promise<unknown[]> => Promise.resolve([]),
  },
};

const createCaller = createCallerFactory(createTRPCRouter({ createForumPost, approveForumPost }));
const as = (uuid: string): ReturnType<typeof createCaller> =>
  createCaller({
    user: { uuid, group_ids: [], name: `${uuid} v/o Test`, email: `${uuid}@example.test` },
    prisma,
    locale: 'de',
  } as unknown as Context);

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** who got a push of which kind */
const pushedTo = (): Record<string, string[]> =>
  Object.fromEntries(
    sendNotification.mock.calls.map((call) => [
      (call[4] as { kind: string }).kind,
      call[1] as string[],
    ]),
  );

const write = (author: string): Promise<{ pending: boolean }> =>
  as(author).createForumPost({ topicId: TOPIC, postId: POST, title: 'Spam? Nein, ein Problem' });

beforeEach(() => {
  moderationRequired = false;
  memberships = [
    { userId: 'mira', chatPermission: ChatMembershipPermission.ADMIN, subscribed: false },
    { userId: 'noah', chatPermission: ChatMembershipPermission.MEMBER, subscribed: false },
    { userId: 'sina', chatPermission: ChatMembershipPermission.MEMBER, subscribed: true },
  ];
  posts = new Map();
  audit = [];
  privateReportTopic = TOPIC;
  jest.mocked(getPayload).mockResolvedValue({
    find: () =>
      Promise.resolve({
        docs: privateReportTopic === undefined ? [] : [{ chatUuid: privateReportTopic }],
      }),
  } as never);
  shifts.clear();
  shifts.set('lea', { scheduleId: 'shift', start: new Date(0), end: new Date(8.64e15) });
  sendNotification.mockClear();
  publish.mockClear();
});

describe('forum moderation', () => {
  it('publishes a post at once while the admin panel does not ask for approval', async () => {
    const { pending } = await write('noah');

    expect(pending).toBe(false);
    expect(posts.get(POST)?.approvedAt).toBeInstanceOf(Date);
  });

  it('holds a post back while approval is required, and tells only the moderators', async () => {
    moderationRequired = true;
    const { pending } = await write('noah');
    await settle();

    expect(pending).toBe(true);
    expect(posts.get(POST)?.approvedAt).toBeNull();
    // the Kernteam of the topic and the piket on duty, nobody else; no live event either
    expect(pushedTo()).toEqual({ SUPPORT: ['mira', 'lea'] });
    expect(publish).not.toHaveBeenCalled();
  });

  it('needs no approval for a post by the Kernteam', async () => {
    moderationRequired = true;
    const { pending } = await write('mira');

    expect(pending).toBe(false);
  });

  it('makes a post public when the piket approves it, and only then announces it', async () => {
    moderationRequired = true;
    await write('noah');
    await settle();
    sendNotification.mockClear();

    await as('lea').approveForumPost({ postId: POST });
    await settle();

    expect(posts.get(POST)?.approvedAt).toBeInstanceOf(Date);
    expect(posts.get(POST)?.approvedById).toBe('lea');
    expect(audit).toEqual([
      expect.objectContaining({ action: 'APPROVED', actorId: 'lea', capacity: 'PIKET' }),
    ]);
    // the subscribers of the topic hear of it now, the piket as a report
    expect(pushedTo()).toEqual({ SUPPORT: ['lea'], CHAT: ['sina'] });
    expect(publish).toHaveBeenCalledWith(expect.objectContaining({ type: 'new_message' }));
  });

  it('approves once, however often it is asked', async () => {
    moderationRequired = true;
    await write('noah');
    await as('lea').approveForumPost({ postId: POST });
    await as('mira').approveForumPost({ postId: POST });

    expect(audit).toHaveLength(1);
  });

  it('refuses the approval of someone who is no moderator', async () => {
    moderationRequired = true;
    await write('noah');

    await expect(as('sina').approveForumPost({ postId: POST })).rejects.toMatchObject({
      reason: 'notAllowed',
    });
    expect(posts.get(POST)?.approvedAt).toBeNull();
  });

  it('sends a private report to the topic editors chose, past the approval, to the Zentrale only', async () => {
    moderationRequired = true;
    const { pending } = await as('tim').createForumPost({
      // whatever topic a client names, a private report goes where editors decided
      topicId: '0193f1a0-0000-7000-8000-0000000000ff',
      postId: POST,
      title: 'Jemand hat mich bedrängt',
      private: true,
    });
    await settle();

    expect(pending).toBe(false);
    expect(posts.get(POST)).toEqual(expect.objectContaining({ private: true }));
    // the reporter belongs to the topic now, so they can follow their report
    expect(membershipOf('tim')?.chatPermission).toBe(ChatMembershipPermission.MEMBER);
    // the Kernteam of the topic and the piket on duty; no subscriber, no live event
    expect(pushedTo()).toEqual({ SUPPORT: ['mira', 'lea'] });
    expect(publish).not.toHaveBeenCalled();
  });

  it('refuses a private report while no topic receives them', async () => {
    privateReportTopic = undefined;

    await expect(
      as('tim').createForumPost({ topicId: TOPIC, postId: POST, title: 'Etwas', private: true }),
    ).rejects.toMatchObject({ reason: 'privateReportsUnavailable' });
    expect(posts.size).toBe(0);
  });
});
