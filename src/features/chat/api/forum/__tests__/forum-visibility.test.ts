jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    // the groups the forum's rights read, none of them held here
    CEVIDB_GROUP_FULL_ADMIN: [],
    CEVIDB_GROUP_WEB_CORE_TEAM: [],
    CEVIDB_GROUP_FORUM_ZENTRALE: [],
  },
}));
jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('payload', () => ({ getPayload: jest.fn() }));
jest.mock('@prisma/client', () =>
  jest.requireActual<typeof import('@/lib/prisma')>('@/lib/prisma'),
);
const publish = jest.fn<Promise<void>, unknown[]>(() => Promise.resolve());
jest.mock('@/lib/db/chat-pubsub', () => ({
  chatPubSub: { publish: (...arguments_: unknown[]): unknown => publish(...arguments_) },
}));
const shifts = new Map<string, { scheduleId: string; start: Date; end: Date }>();
jest.mock('@/features/chat/api/utils/piket-service', () => ({
  findActivePiketShift: (userId: string): Promise<unknown> => Promise.resolve(shifts.get(userId)),
  getActivePiketMembers: (): Promise<unknown[]> =>
    Promise.resolve([...shifts.keys()].map((id) => ({ id, name: id }))),
}));

import {
  canSeeForumPost,
  type ForumPostVisibility,
  publishForumThreadEvent,
} from '@/features/chat/api/forum/forum-visibility';
import type { ChatRealtimeEvent } from '@/lib/db/chat-pubsub';
import { ChatMembershipPermission, ChatType } from '@/lib/prisma';
import type { PrismaClientOrTransaction } from '@/types/types';

const TOPIC = '0193f1a0-0000-7000-8000-000000000001';

/** Mira is the topic's Kernteam, Noah wrote the post, Sina only reads the topic. */
const memberships = [
  { userId: 'mira', chatPermission: ChatMembershipPermission.ADMIN },
  { userId: 'noah', chatPermission: ChatMembershipPermission.MEMBER },
  { userId: 'sina', chatPermission: ChatMembershipPermission.MEMBER },
];

const prisma = {
  chatMembership: {
    findUnique: ({ where }: { where: { userId_chatId: { userId: string } } }): Promise<unknown> => {
      const membership = memberships.find((m) => m.userId === where.userId_chatId.userId);
      return Promise.resolve(
        membership === undefined
          ? null
          : { chatPermission: membership.chatPermission, chat: { type: ChatType.FORUM } },
      );
    },
    findMany: ({ where }: { where: { chatPermission: { in: string[] } } }): Promise<unknown[]> =>
      Promise.resolve(
        memberships
          .filter((m) => where.chatPermission.in.includes(m.chatPermission))
          .map((m) => ({ userId: m.userId })),
      ),
  },
  chat: {
    findUnique: (): Promise<unknown> => Promise.resolve({ type: ChatType.FORUM }),
  },
  forumPostAssignment: {
    findFirst: (): Promise<null> => Promise.resolve(null),
    findMany: (): Promise<unknown[]> => Promise.resolve([]),
  },
} as unknown as PrismaClientOrTransaction;

/** a participant as the session knows them, in no group that holds a role */
const person = (uuid: string): { uuid: string; group_ids: number[] } => ({ uuid, group_ids: [] });

const post = (overrides: Partial<ForumPostVisibility>): ForumPostVisibility => ({
  messageId: '0193f1a0-0000-7000-8000-0000000000aa',
  chatId: TOPIC,
  private: false,
  approvedAt: new Date(),
  authorId: 'noah',
  ...overrides,
});

const comment: ChatRealtimeEvent = {
  type: 'new_message',
  chatId: TOPIC,
  senderId: 'mira',
  message: {
    id: 'comment',
    createdAt: new Date(),
    messagePayload: { text: 'Wir kümmern uns darum.' },
    senderId: 'mira',
    status: 'STORED',
    type: 'TEXT_MSG',
    parentId: '0193f1a0-0000-7000-8000-0000000000aa',
  },
};

beforeEach(() => {
  publish.mockClear();
  shifts.clear();
  shifts.set('lea', { scheduleId: 'shift', start: new Date(0), end: new Date(8.64e15) });
});

describe('who sees a forum post', () => {
  it('shows a public post to every member of the topic', async () => {
    await expect(canSeeForumPost(prisma, person('sina'), post({}))).resolves.toBe(true);
  });

  it('shows a private report to its author, the Kernteam and the piket, and to nobody else', async () => {
    const report = post({ private: true });

    await expect(canSeeForumPost(prisma, person('noah'), report)).resolves.toBe(true);
    await expect(canSeeForumPost(prisma, person('mira'), report)).resolves.toBe(true);
    await expect(canSeeForumPost(prisma, person('lea'), report)).resolves.toBe(true);
    await expect(canSeeForumPost(prisma, person('sina'), report)).resolves.toBe(false);
  });

  it('hides a post waiting for approval the same way', async () => {
    await expect(canSeeForumPost(prisma, person('sina'), post({ approvedAt: null }))).resolves.toBe(
      false,
    );
  });
});

describe('live events of a forum thread', () => {
  it('go to the topic channel for a public post', async () => {
    await publishForumThreadEvent(prisma, post({}), comment);

    expect(publish).toHaveBeenCalledWith(comment);
  });

  it('go only to the personal channels of those who see a private report', async () => {
    await publishForumThreadEvent(prisma, post({ private: true }), comment);

    const channels = publish.mock.calls.map((call) => call[0]);
    expect(channels).toEqual(expect.arrayContaining(['lea', 'mira', 'noah']));
    expect(channels).toHaveLength(3);
    expect(publish.mock.calls.every((call) => call[1] === comment)).toBe(true);
  });
});
