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

/** who is on forum piket duty right now, by user id */
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

import { updateForumPostStatus } from '@/features/chat/api/forum/forum-mutations';
import { ChatMembershipPermission, ChatType } from '@/lib/prisma/enums';

const TOPIC = '0193f1a0-0000-7000-8000-000000000001';
const POST = '0193f1a0-0000-7000-8000-0000000000aa';

interface Assignment {
  id: string;
  messageId: string;
  assigneeId: string;
  assignedById: string;
  addedMembership: boolean;
  endedAt: Date | null;
  endedById: string | null;
}

let post: { status: string; statusChangedById: string | null; mergedIntoId: string | null };
let memberships: { userId: string; chatId: string; chatPermission: ChatMembershipPermission }[];
let assignments: Assignment[];
let audit: Record<string, unknown>[];
let subscriptions: { userId: string; messageId: string }[];
let reactedAt: Date | undefined;

const prisma = {
  $transaction: <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => callback(prisma),
  $executeRaw: (): Promise<number> => Promise.resolve(0),
  chat: { findUnique: (): Promise<unknown> => Promise.resolve({ type: ChatType.FORUM }) },
  forumPost: {
    // the first reaction, which takes the post out of the Zentrale's queue
    updateManyAndReturn: ({ data }: { data: { reactedAt: Date } }): Promise<unknown[]> => {
      if (reactedAt !== undefined) return Promise.resolve([]);
      reactedAt = data.reactedAt;
      return Promise.resolve([{ createdAt: new Date(0), kind: 'PROBLEM', chatId: TOPIC }]);
    },
    findUnique: (): Promise<unknown> =>
      Promise.resolve({
        messageId: POST,
        chatId: TOPIC,
        title: 'Toitoi in der Mitte ist voll',
        status: post.status,
        statusChangedById: post.statusChangedById,
        mergedIntoId: post.mergedIntoId,
        pinnedAt: null,
        answerMessageId: null,
        chat: { name: 'Platz & Infrastruktur', type: ChatType.FORUM },
        message: { senderId: 'noah', deletedAt: null },
      }),
    update: ({ data }: { data: { status: string; statusChangedById: string } }): Promise<void> => {
      post = { ...post, status: data.status, statusChangedById: data.statusChangedById };
      return Promise.resolve();
    },
  },
  chatMembership: {
    findUnique: ({
      where,
    }: {
      where: { userId_chatId: { userId: string; chatId: string } };
    }): Promise<unknown> => {
      const membership = memberships.find(
        (m) => m.userId === where.userId_chatId.userId && m.chatId === where.userId_chatId.chatId,
      );
      return Promise.resolve(
        membership === undefined
          ? null
          : { chatPermission: membership.chatPermission, chat: { type: ChatType.FORUM } },
      );
    },
    deleteMany: ({ where }: { where: { userId: string; chatId: string } }): Promise<void> => {
      memberships = memberships.filter(
        (m) =>
          !(
            m.userId === where.userId &&
            m.chatId === where.chatId &&
            m.chatPermission === ChatMembershipPermission.MEMBER
          ),
      );
      return Promise.resolve();
    },
  },
  forumPostAssignment: {
    findFirst: ({ where }: { where: { assigneeId: string } }): Promise<unknown> => {
      const open = assignments.find((a) => a.assigneeId === where.assigneeId && a.endedAt === null);
      return Promise.resolve(
        open === undefined
          ? null
          : { id: open.id, assignedById: open.assignedById, assignedBy: { name: 'Lea v/o Funke' } },
      );
    },
    count: ({ where }: { where: { assigneeId: string; endedAt?: null } }): Promise<number> =>
      Promise.resolve(
        assignments.filter(
          (a) => a.assigneeId === where.assigneeId && (!('endedAt' in where) || a.endedAt === null),
        ).length,
      ),
    findMany: (): Promise<unknown[]> =>
      Promise.resolve(
        assignments
          .filter((a) => a.endedAt === null)
          .map((a) => ({ ...a, post: { chatId: TOPIC } })),
      ),
    updateMany: ({
      where,
      data,
    }: {
      where: { id: { in: string[] } };
      data: { endedAt: Date; endedById: string };
    }): Promise<void> => {
      assignments = assignments.map((a) => (where.id.in.includes(a.id) ? { ...a, ...data } : a));
      return Promise.resolve();
    },
  },
  forumAuditEvent: {
    create: ({ data }: { data: Record<string, unknown> }): Promise<void> => {
      audit.push(data);
      return Promise.resolve();
    },
  },
  threadSubscription: {
    findMany: (): Promise<unknown[]> => Promise.resolve(subscriptions),
  },
};

const createCaller = createCallerFactory(createTRPCRouter({ updateForumPostStatus }));
const as = (uuid: string): ReturnType<typeof createCaller> =>
  createCaller({
    user: { uuid, group_ids: [], name: `${uuid} v/o Test`, email: `${uuid}@example.test` },
    prisma,
    locale: 'de',
  } as unknown as Context);

const reasonOf = async (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => 'resolved',
    (error: unknown) => (error as { reason?: unknown }).reason,
  );

beforeEach(() => {
  post = { status: 'IN_PROGRESS', statusChangedById: 'lea', mergedIntoId: null };
  memberships = [
    { userId: 'mira', chatId: TOPIC, chatPermission: ChatMembershipPermission.ADMIN },
    { userId: 'noah', chatId: TOPIC, chatPermission: ChatMembershipPermission.MEMBER },
    { userId: 'lea', chatId: TOPIC, chatPermission: ChatMembershipPermission.MEMBER },
    { userId: 'tim', chatId: TOPIC, chatPermission: ChatMembershipPermission.MEMBER },
  ];
  assignments = [
    {
      id: 'assignment-tim',
      messageId: POST,
      assigneeId: 'tim',
      assignedById: 'lea',
      addedMembership: true,
      endedAt: null,
      endedById: null,
    },
  ];
  audit = [];
  subscriptions = [{ userId: 'noah', messageId: POST }];
  reactedAt = undefined;
  shifts.clear();
  shifts.set('lea', {
    scheduleId: 'shift-27-07',
    start: new Date('2027-07-27T06:00:00Z'),
    end: new Date('2027-07-27T12:30:00Z'),
  });
  sendNotification.mockClear();
});

describe('updateForumPostStatus', () => {
  it("takes the post out of the Zentrale's queue with its first status change", async () => {
    await as('lea').updateForumPostStatus({ postId: POST, status: 'DONE' });

    expect(reactedAt).toBeInstanceOf(Date);
  });

  it('lets a helper report their post as done, recorded with who sent them', async () => {
    await as('tim').updateForumPostStatus({
      postId: POST,
      status: 'DONE',
      note: 'Abgepumpt, wieder benutzbar',
    });

    expect(post.status).toBe('DONE');
    expect(audit).toEqual([
      expect.objectContaining({
        action: 'STATUS_CHANGED',
        actorId: 'tim',
        capacity: 'DELEGATE',
        assignmentId: 'assignment-tim',
        delegatedById: 'lea',
        delegatedByName: 'Lea v/o Funke',
        before: { status: 'IN_PROGRESS' },
        after: { status: 'DONE' },
        note: 'Abgepumpt, wieder benutzbar',
      }),
    ]);
  });

  it('ends the assignment with the post and takes back the membership it added', async () => {
    await as('tim').updateForumPostStatus({ postId: POST, status: 'DONE' });

    expect(assignments[0]?.endedAt).toBeInstanceOf(Date);
    expect(memberships.some((m) => m.userId === 'tim')).toBe(false);
    expect(await reasonOf(as('tim').updateForumPostStatus({ postId: POST, status: 'OPEN' }))).toBe(
      'assignmentEnded',
    );
  });

  it('records the shift of the piket on duty', async () => {
    await as('lea').updateForumPostStatus({ postId: POST, status: 'DONE' });

    expect(audit[0]).toEqual(
      expect.objectContaining({
        capacity: 'PIKET',
        piketScheduleId: 'shift-27-07',
        shiftStart: new Date('2027-07-27T06:00:00Z'),
        shiftEnd: new Date('2027-07-27T12:30:00Z'),
      }),
    );
  });

  it('lets the Kernteam act as Kernteam even on piket duty', async () => {
    shifts.set('mira', { scheduleId: 'shift-mira', start: new Date(0), end: new Date() });
    await as('mira').updateForumPostStatus({ postId: POST, status: 'OPEN' });

    expect(audit[0]).toEqual(expect.objectContaining({ capacity: 'TOPIC_ADMIN' }));
    expect(audit[0]).not.toHaveProperty('piketScheduleId');
  });

  it('refuses a member with no shift and no assignment', async () => {
    expect(await reasonOf(as('noah').updateForumPostStatus({ postId: POST, status: 'DONE' }))).toBe(
      'notAllowed',
    );
    expect(post.status).toBe('IN_PROGRESS');
    expect(audit).toEqual([]);
  });

  it('never tells someone without the right that the post is already done', async () => {
    post = { status: 'DONE', statusChangedById: 'lea', mergedIntoId: null };

    expect(await reasonOf(as('noah').updateForumPostStatus({ postId: POST, status: 'DONE' }))).toBe(
      'notAllowed',
    );
  });

  it('refuses a piket member once the shift is over', async () => {
    shifts.delete('lea');
    expect(await reasonOf(as('lea').updateForumPostStatus({ postId: POST, status: 'DONE' }))).toBe(
      'notAllowed',
    );
  });

  it('answers a replay of the own change without a second entry', async () => {
    await as('tim').updateForumPostStatus({ postId: POST, status: 'DONE' });
    await as('tim').updateForumPostStatus({ postId: POST, status: 'DONE' });

    expect(audit).toHaveLength(1);
  });

  it('tells a helper their assignment ended when someone else reported the post as done first', async () => {
    await as('lea').updateForumPostStatus({ postId: POST, status: 'DONE' });

    expect(await reasonOf(as('tim').updateForumPostStatus({ postId: POST, status: 'DONE' }))).toBe(
      'assignmentEnded',
    );
  });

  it('tells a moderator when someone else reported the post as done first', async () => {
    await as('lea').updateForumPostStatus({ postId: POST, status: 'DONE' });

    expect(await reasonOf(as('mira').updateForumPostStatus({ postId: POST, status: 'DONE' }))).toBe(
      'postAlreadyDone',
    );
  });

  it('pushes the new status to the post’s subscribers, not to the one who changed it', async () => {
    subscriptions = [
      { userId: 'noah', messageId: POST },
      { userId: 'tim', messageId: POST },
    ];
    await as('tim').updateForumPostStatus({ postId: POST, status: 'DONE', note: 'Läuft wieder' });
    await new Promise((resolve) => setImmediate(resolve));

    expect(sendNotification).toHaveBeenCalledWith(
      'Status: Erledigt. Läuft wieder',
      ['noah'],
      TOPIC,
      undefined,
      expect.objectContaining({ path: `/app/forum/${POST}`, senderName: 'tim v/o Test' }),
    );
  });
});
