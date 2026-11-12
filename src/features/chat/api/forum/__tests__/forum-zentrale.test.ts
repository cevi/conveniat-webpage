import type { Context } from '@/trpc/init';
import { createCallerFactory, createTRPCRouter } from '@/trpc/init';

jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
jest.mock('@payload-config', () => ({}), { virtual: true });
/** the functions of Funktionen und Adressbuch, as Payload lists them */
jest.mock('payload', () => ({
  getPayload: (): Promise<unknown> =>
    Promise.resolve({
      find: (): Promise<unknown> =>
        Promise.resolve({
          docs: [{ id: 'infra', label: { de: 'Ressortleitung Infrastruktur' }, order: 5 }],
        }),
    }),
}));
// group 110 holds the Forum-Zentrale role
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [],
    CEVIDB_GROUP_WEB_CORE_TEAM: [],
    CEVIDB_GROUP_FORUM_ZENTRALE: [110],
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
jest.mock('@/lib/db/chat-pubsub', () => ({ chatPubSub: { publish: jest.fn() } }));
jest.mock('@/features/chat/api/utils/piket-service', () => ({
  findActivePiketShift: (): Promise<void> => Promise.resolve(),
  getActivePiketMembers: (): Promise<unknown[]> => Promise.resolve([]),
}));
const pushedTo: string[] = [];
jest.mock('@/features/chat/api/forum/forum-push', () => ({
  pushForumPerson: ({ recipientId }: { recipientId: string }): void => {
    pushedTo.push(recipientId);
  },
  pushForumThread: jest.fn(),
  pushNewForumPost: jest.fn(),
  pushForumModerators: jest.fn(),
}));

import {
  findModeratedTopicIds,
  resolveForumModerator,
} from '@/features/chat/api/forum/forum-moderator';
import {
  claimForumPost,
  createForumPostAssignment,
  endForumPostAssignment,
  moveForumPost,
} from '@/features/chat/api/forum/forum-mutations';
import { ChatMembershipPermission, ChatType } from '@/lib/prisma/enums';
import type { PrismaClientOrTransaction } from '@/types/types';

const PLATZ = '0193f1a0-0000-7000-8000-000000000001';
const PROGRAMM = '0193f1a0-0000-7000-8000-000000000002';
const POST = '0193f1a0-0000-7000-8000-0000000000aa';

interface Assignment {
  id: string;
  messageId: string;
  kind: 'HELPER' | 'CLAIM';
  funktionId: string | null;
  assigneeId: string;
  assignedById: string;
  addedMembership: boolean;
  endedAt: Date | null;
}

/** Mira is the Kernteam of both topics, Noah wrote the post, Eda and Alicia lead Infrastruktur. */
let memberships: { userId: string; chatId: string; chatPermission: ChatMembershipPermission }[];
let assignments: Assignment[];
let post: { chatId: string; status: string; private: boolean };
let movedMessagesTo: string | undefined;
let audit: Record<string, unknown>[];
let nextId = 0;

const users: Record<string, { name: string; funktionIds: string[] }> = {
  mira: { name: 'Mira v/o Pfau', funktionIds: [] },
  noah: { name: 'Noah v/o Biber', funktionIds: [] },
  eda: { name: 'Eda v/o Hermine', funktionIds: ['infra'] },
  alicia: { name: 'Alicia v/o Umut', funktionIds: ['infra'] },
};

const isOpen = (assignment: Assignment): boolean => assignment.endedAt === null;
const matchesAssignment = (assignment: Assignment, where: Record<string, unknown>): boolean =>
  Object.entries(where).every(([key, value]) => {
    if (key === 'id' && typeof value === 'object' && value !== null) {
      return (value as { in: string[] }).in.includes(assignment.id);
    }
    if (key === 'post') return true;
    return assignment[key as keyof Assignment] === value;
  });

const prisma = {
  $transaction: <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => callback(prisma),
  $executeRaw: (): Promise<number> => Promise.resolve(0),
  chat: {
    findUnique: ({ where }: { where: { uuid: string } }): Promise<unknown> =>
      Promise.resolve({
        uuid: where.uuid,
        name: where.uuid === PLATZ ? 'Platz & Infrastruktur' : 'Programm',
        type: ChatType.FORUM,
        archivedAt: null,
      }),
  },
  user: {
    findUnique: ({ where }: { where: { uuid: string } }): Promise<unknown> => {
      const user = users[where.uuid];
      return Promise.resolve(user === undefined ? null : { uuid: where.uuid, name: user.name });
    },
    findMany: ({ where }: { where: { funktionIds: { has: string } } }): Promise<unknown[]> =>
      Promise.resolve(
        Object.entries(users)
          .filter(([, user]) => user.funktionIds.includes(where.funktionIds.has))
          .map(([uuid, user]) => ({ uuid, name: user.name })),
      ),
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
        membership === undefined ? null : { ...membership, chat: { type: ChatType.FORUM } },
      );
    },
    findMany: ({ where }: { where: { userId: string } }): Promise<unknown[]> =>
      Promise.resolve(
        memberships
          .filter(
            (m) =>
              m.userId === where.userId &&
              (m.chatPermission === ChatMembershipPermission.OWNER ||
                m.chatPermission === ChatMembershipPermission.ADMIN),
          )
          .map((m) => ({ chatId: m.chatId })),
      ),
    count: ({ where }: { where: { chatId: string; userId: string } }): Promise<number> =>
      Promise.resolve(
        memberships.filter((m) => m.chatId === where.chatId && m.userId === where.userId).length,
      ),
    create: ({
      data,
    }: {
      data: { userId: string; chatId: string; chatPermission: ChatMembershipPermission };
    }): Promise<void> => {
      memberships.push(data);
      return Promise.resolve();
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
  forumPost: {
    findUnique: (): Promise<unknown> =>
      Promise.resolve({
        messageId: POST,
        chatId: post.chatId,
        title: 'Kein Wasser bei den Toiletten Nord',
        status: post.status,
        statusChangedById: null,
        mergedIntoId: null,
        pinnedAt: null,
        answerMessageId: null,
        chat: {
          name: post.chatId === PLATZ ? 'Platz & Infrastruktur' : 'Programm',
          type: ChatType.FORUM,
        },
        message: { senderId: 'noah', deletedAt: null },
      }),
    findUniqueOrThrow: (): Promise<unknown> => Promise.resolve({ private: post.private }),
    update: ({ data }: { data: { chatId?: string } }): Promise<void> => {
      if (data.chatId !== undefined) post = { ...post, chatId: data.chatId };
      return Promise.resolve();
    },
    updateMany: (): Promise<void> => Promise.resolve(),
  },
  message: {
    updateMany: ({ data }: { data: { chatId: string } }): Promise<void> => {
      movedMessagesTo = data.chatId;
      return Promise.resolve();
    },
  },
  forumPostAssignment: {
    findFirst: ({ where }: { where: Record<string, unknown> }): Promise<unknown> => {
      const found = assignments.find((a) => matchesAssignment(a, where));
      return Promise.resolve(
        found === undefined
          ? null
          : { ...found, assignedBy: { name: users[found.assignedById]?.name ?? '' } },
      );
    },
    findUnique: ({ where }: { where: { id: string } }): Promise<unknown> => {
      const found = assignments.find((a) => a.id === where.id);
      return Promise.resolve(
        found === undefined
          ? null
          : { ...found, assignee: { name: users[found.assigneeId]?.name ?? '' } },
      );
    },
    findMany: ({ where }: { where: Record<string, unknown> }): Promise<unknown[]> =>
      Promise.resolve(
        assignments
          .filter((a) => matchesAssignment(a, where))
          .map((a) => ({ ...a, post: { chatId: post.chatId } })),
      ),
    count: ({ where }: { where: { assigneeId: string } }): Promise<number> =>
      Promise.resolve(
        assignments.filter((a) => isOpen(a) && a.assigneeId === where.assigneeId).length,
      ),
    create: ({ data }: { data: Partial<Assignment> }): Promise<{ id: string }> => {
      nextId += 1;
      const id = `0193f1a0-0000-7000-8000-${String(nextId).padStart(12, '0')}`;
      assignments.push({
        id,
        messageId: POST,
        kind: 'HELPER',
        funktionId: null,
        assigneeId: '',
        assignedById: '',
        addedMembership: false,
        endedAt: null,
        ...data,
      });
      return Promise.resolve({ id });
    },
    updateMany: ({
      where,
      data,
    }: {
      where: { id: { in: string[] } };
      data: { endedAt: Date };
    }): Promise<void> => {
      assignments = assignments.map((a) =>
        where.id.in.includes(a.id) ? { ...a, endedAt: data.endedAt } : a,
      );
      return Promise.resolve();
    },
  },
  forumAuditEvent: {
    create: ({ data }: { data: Record<string, unknown> }): Promise<void> => {
      audit.push(data);
      return Promise.resolve();
    },
  },
  threadSubscription: { createMany: (): Promise<void> => Promise.resolve() },
};

const createCaller = createCallerFactory(
  createTRPCRouter({
    claimForumPost,
    createForumPostAssignment,
    endForumPostAssignment,
    moveForumPost,
  }),
);
const as = (uuid: string, groupIds: number[] = []): ReturnType<typeof createCaller> =>
  createCaller({
    user: { uuid, group_ids: groupIds, name: users[uuid]?.name ?? uuid, email: `${uuid}@test` },
    prisma,
    locale: 'de',
  } as unknown as Context);

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
const open = (kind: Assignment['kind']): Assignment[] =>
  assignments.filter((a) => isOpen(a) && a.kind === kind);

beforeEach(() => {
  memberships = [
    { userId: 'mira', chatId: PLATZ, chatPermission: ChatMembershipPermission.ADMIN },
    { userId: 'mira', chatId: PROGRAMM, chatPermission: ChatMembershipPermission.ADMIN },
    { userId: 'noah', chatId: PLATZ, chatPermission: ChatMembershipPermission.MEMBER },
  ];
  assignments = [];
  post = { chatId: PLATZ, status: 'OPEN', private: false };
  movedMessagesTo = undefined;
  audit = [];
  pushedTo.length = 0;
});

describe('the Forum-Zentrale role', () => {
  it('moderates every topic, without being in any', async () => {
    const zentrale = { uuid: 'lia', group_ids: [110] };
    const db = prisma as unknown as PrismaClientOrTransaction;

    await expect(resolveForumModerator(db, zentrale, PLATZ)).resolves.toEqual({
      capacity: 'ZENTRALE',
    });
    await expect(findModeratedTopicIds(db, zentrale)).resolves.toBe('all');
    await expect(resolveForumModerator(db, { uuid: 'noah', group_ids: [] }, PLATZ)).resolves.toBe(
      undefined,
    );
  });
});

describe('Ich übernehme', () => {
  it('takes a post from whoever had it, and changes nothing about the post', async () => {
    await as('lia', [110]).claimForumPost({ postId: POST });
    await as('mira').claimForumPost({ postId: POST });

    expect(open('CLAIM').map((claim) => claim.assigneeId)).toEqual(['mira']);
    expect(post.status).toBe('OPEN');
    expect(audit).toEqual([]);
  });

  it('is refused to a participant who handles no posts', async () => {
    await expect(as('noah').claimForumPost({ postId: POST })).rejects.toMatchObject({
      reason: 'notAllowed',
    });
  });
});

describe('Weiterleiten', () => {
  it('forwards to a Ressort as one forward for each of its holders, who each get a push', async () => {
    await as('mira').createForumPostAssignment({ postId: POST, funktionId: 'infra' });
    await settle();

    expect(open('HELPER').map((a) => [a.assigneeId, a.funktionId])).toEqual([
      ['eda', 'infra'],
      ['alicia', 'infra'],
    ]);
    // they join the topic for it, and the post stays as it is: forwarding is no reaction
    expect(memberships.filter((m) => m.chatId === PLATZ).map((m) => m.userId)).toEqual(
      expect.arrayContaining(['eda', 'alicia']),
    );
    expect(post.status).toBe('OPEN');
    expect(pushedTo).toEqual(['eda', 'alicia']);
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      action: 'ASSIGNED',
      after: { assigneeName: 'Ressortleitung Infrastruktur' },
    });
  });

  it('lets a holder hand it back for the whole Ressort, and tells the others', async () => {
    await as('mira').createForumPostAssignment({ postId: POST, funktionId: 'infra' });
    pushedTo.length = 0;
    const own = open('HELPER').find((a) => a.assigneeId === 'eda');

    await as('eda').endForumPostAssignment({ assignmentId: own?.id ?? '' });
    await settle();

    expect(open('HELPER')).toEqual([]);
    expect(pushedTo).toEqual(['alicia']);
  });
});

describe('moving a post', () => {
  it('takes the post and its comments to the other topic', async () => {
    memberships.push({ userId: 'noah', chatId: PROGRAMM, chatPermission: 'MEMBER' });

    await as('mira').moveForumPost({ postId: POST, topicId: PROGRAMM });
    await settle();

    expect(post.chatId).toBe(PROGRAMM);
    expect(movedMessagesTo).toBe(PROGRAMM);
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      action: 'MOVED',
      before: { topicName: 'Platz & Infrastruktur' },
      after: { topicName: 'Programm' },
    });
    expect(pushedTo).toEqual(['noah']);
  });

  it('refuses a topic its author is not in, who would lose their own post', async () => {
    await expect(
      as('mira').moveForumPost({ postId: POST, topicId: PROGRAMM }),
    ).rejects.toMatchObject({ reason: 'authorNotInTopic' });
    expect(post.chatId).toBe(PLATZ);
  });

  it('keeps a private report where private reports go', async () => {
    post = { ...post, private: true };
    memberships.push({ userId: 'noah', chatId: PROGRAMM, chatPermission: 'MEMBER' });

    await expect(
      as('mira').moveForumPost({ postId: POST, topicId: PROGRAMM }),
    ).rejects.toMatchObject({ reason: 'privateStays' });
  });
});
