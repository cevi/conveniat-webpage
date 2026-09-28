import type { Context } from '@/trpc/init';
import { createCallerFactory, createTRPCRouter } from '@/trpc/init';

jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
// `createChat` and `addParticipants` read the group size limit; an unsaved global leaves the
// default.
jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('payload', () => ({
  getPayload: (): Promise<unknown> =>
    Promise.resolve({ findGlobal: (): Promise<unknown> => Promise.resolve({}) }),
}));
jest.mock('@/config/environment-variables', () => ({ environmentVariables: {} }));
jest.mock('@/utils/get-locale-from-cookies', () => ({
  getLocaleFromCookies: jest.fn().mockResolvedValue('de'),
}));
// Only the wire transformer; a direct caller never serializes anything.
jest.mock('superjson', () => ({
  __esModule: true,
  default: {
    serialize: (value: unknown): { json: unknown } => ({ json: value }),
    deserialize: (value: { json: unknown }): unknown => value.json,
  },
}));
// `createNewChat` reads the enums from the package, which only the generated `@/lib/prisma`
// client provides here.
jest.mock('@prisma/client', () =>
  jest.requireActual<typeof import('@/lib/prisma')>('@/lib/prisma'),
);
jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/ability', () => ({
  Ability: { can: (): Promise<boolean> => Promise.resolve(true) },
}));
jest.mock('@/lib/capabilities', () => ({
  checkCapability: (): Promise<boolean> => Promise.resolve(true),
}));
jest.mock('@/features/chat/api/utils/piket-service', () => ({
  getActivePiketMembers: (): Promise<unknown[]> => Promise.resolve([]),
}));

/** Calls counted so far per rate limit key; the window never ends within a test. */
const rateLimitCounts = new Map<string, number>();
jest.mock('@/lib/db/redis', () => ({
  getFeatureFlag: (): Promise<boolean> => Promise.resolve(true),
  redis: {
    eval: (_script: string, _keys: number, key: string): Promise<number> => {
      const count = (rateLimitCounts.get(key) ?? 0) + 1;
      rateLimitCounts.set(key, count);
      return Promise.resolve(count);
    },
  },
}));

const mockPublish = jest.fn((): Promise<void> => Promise.resolve());
const mockSendNotification = jest.fn((): Promise<void> => Promise.resolve());
jest.mock('@/lib/db/chat-pubsub', () => ({
  chatPubSub: { publish: (...args: unknown[]): unknown => mockPublish(...(args as [])) },
}));
jest.mock('@/features/chat/api/utils/send-push-notifications', () => ({
  sendNotification: (...args: unknown[]): unknown => mockSendNotification(...(args as [])),
}));

import { addParticipants } from '@/features/chat/api/mutations/add-participants';
import { createChat } from '@/features/chat/api/mutations/create-chat';
import { createChatInvite } from '@/features/chat/api/mutations/create-chat-invite';
import { createMessage } from '@/features/chat/api/mutations/create-message';
import { renameChat } from '@/features/chat/api/mutations/rename-chat';
import { reportProblem } from '@/features/chat/api/mutations/report-problem';
import { toggleReaction } from '@/features/chat/api/mutations/toggle-reaction';
import { ChatCapability } from '@/lib/chat-shared';
import { ChatMembershipPermission, ChatType, MessageType } from '@/lib/prisma';

const CHAT_ID = '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b';
const OTHER_CHAT_ID = '0190a5b2-0000-7000-8000-000000000002';
const THREAD_ID = '0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d';

// user ids are Mongo ids, which `createChat` checks
const ANNA = '65f000000000000000000001';
const BEN = '65f000000000000000000002';
const CARLA = '65f000000000000000000003';
const DARIO = '65f000000000000000000004';

interface Membership {
  userId: string;
  chatId: string;
  hasDeleted: boolean;
  chatPermission: ChatMembershipPermission;
}

let chatType: ChatType;
let chatCapabilities: ChatCapability[];
let memberships: Membership[];
/** The messages of the one chat, top level and replies. */
let messages: { uuid: string; parentId?: string; senderId: string | null }[];
/** Reactions to the message in `messages[0]`. */
let reactions: { uuid: string; userId: string; emoji: string }[];
/** Every chat `findFirst` could match, for the private chat lookup. */
let existingChats: { uuid: string; type: ChatType }[];
let transactions: number;
let writes: { operation: string; data?: unknown }[];

const chatRow = (): unknown => ({
  uuid: CHAT_ID,
  name: 'Cevi Uster',
  type: chatType,
  status: 'OPEN',
  capabilities: chatCapabilities,
  // eslint-disable-next-line unicorn/no-null
  archivedAt: null,
  createdAt: new Date(0),
  lastUpdate: new Date(0),
  chatMemberships: memberships,
});

const record =
  (operation: string, result: unknown = {}) =>
  ({ data }: { data?: unknown } = {}): Promise<unknown> => {
    writes.push({ operation, data });
    return Promise.resolve(result);
  };

/** The chat tables, with just enough of Prisma's behaviour for the procedures under test. */
const prisma = {
  $transaction: <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => {
    transactions++;
    return callback(prisma);
  },
  $executeRaw: (): Promise<number> => Promise.resolve(1),
  chat: {
    findUnique: (): Promise<unknown> => Promise.resolve(chatRow()),
    findUniqueOrThrow: (): Promise<unknown> => Promise.resolve(chatRow()),
    // Only the chat type is matched: membership filters are Postgres' job.
    findFirst: ({ where }: { where: { type?: ChatType } }): Promise<unknown> => {
      const match = existingChats.find(
        (chat) => where.type === undefined || chat.type === where.type,
      );
      return Promise.resolve(
        // eslint-disable-next-line unicorn/no-null
        match === undefined ? null : { ...match, chatMemberships: [{}, {}] },
      );
    },
    create: record('chat.create', { uuid: 'new-chat', name: '' }),
    update: record('chat.update'),
  },
  chatMembership: { createMany: record('chatMembership.createMany') },
  chatInvite: {
    deleteMany: record('chatInvite.deleteMany'),
    create: record('chatInvite.create', { token: 'token', expiresAt: new Date() }),
  },
  user: { upsert: record('user.upsert') },
  message: {
    findUnique: ({ where }: { where: { uuid: string } }): Promise<unknown> =>
      Promise.resolve(
        where.uuid === THREAD_ID
          ? {
              uuid: THREAD_ID,
              chatId: CHAT_ID,
              senderId: BEN,
              type: MessageType.TEXT_MSG,
              createdAt: new Date(0),
              contentVersions: [{ revision: 0, payload: { text: 'Wer kommt mit?' } }],
            }
          : // eslint-disable-next-line unicorn/no-null
            null,
      ),
    findMany: ({
      where,
    }: {
      where: { OR: [{ uuid: string }, { parentId: string }] };
    }): Promise<unknown> => {
      const [{ uuid }, { parentId }] = where.OR;
      const inThread = messages.filter(
        (message) => message.uuid === uuid || message.parentId === parentId,
      );
      const senders = [...new Set(inThread.map((message) => message.senderId))];
      return Promise.resolve(senders.map((senderId) => ({ senderId })));
    },
    create: record('message.create', { uuid: 'new-message', createdAt: new Date() }),
  },
  messageEvent: { createMany: record('messageEvent.createMany') },
  messageReaction: {
    findUnique: ({
      where,
    }: {
      where: { messageId_userId_emoji: { userId: string; emoji: string } };
    }): Promise<unknown> => {
      const { userId, emoji } = where.messageId_userId_emoji;
      return Promise.resolve(
        // eslint-disable-next-line unicorn/no-null
        reactions.find((r) => r.userId === userId && r.emoji === emoji) ?? null,
      );
    },
    count: ({ where }: { where: { userId: string } }): Promise<number> =>
      Promise.resolve(reactions.filter((r) => r.userId === where.userId).length),
    create: record('messageReaction.create'),
    delete: record('messageReaction.delete'),
  },
};

const createCaller = createCallerFactory(
  createTRPCRouter({
    sendMessage: createMessage,
    reportProblem,
    createChatInvite,
    createChat,
    addParticipants,
    renameChat,
    toggleReaction,
  }),
);
type Caller = ReturnType<typeof createCaller>;

const as = (uuid: string, locale: 'de' | 'fr' | 'en' = 'de'): Caller =>
  createCaller({
    user: { uuid, group_ids: [], name: `Name of ${uuid}`, email: `${uuid}@example.test` },
    prisma,
    locale,
  } as unknown as Context);

const member = (
  userId: string,
  chatPermission: ChatMembershipPermission = ChatMembershipPermission.MEMBER,
  hasDeleted = false,
): Membership => ({ userId, chatId: CHAT_ID, hasDeleted, chatPermission });

/** The error a call failed with, or `undefined` when it went through. */
const errorOf = async (
  call: Promise<unknown>,
): Promise<{ code: string; message: string } | undefined> => {
  let failure: { code: string; message: string } | undefined;
  await call.catch((error: unknown) => {
    failure = error as { code: string; message: string };
  });
  return failure;
};

const pushRecipients = (): unknown[] =>
  (mockSendNotification.mock.calls as unknown[][]).map((call) => call[1]);

beforeEach(() => {
  jest.clearAllMocks();
  rateLimitCounts.clear();
  chatType = ChatType.GROUP;
  chatCapabilities = [
    ChatCapability.CAN_SEND_MESSAGES,
    ChatCapability.THREADS,
    ChatCapability.EMOJI_REACTIONS,
  ];
  memberships = [
    member(ANNA, ChatMembershipPermission.OWNER),
    member(BEN),
    member(CARLA),
    member(DARIO),
  ];
  messages = [
    { uuid: THREAD_ID, senderId: BEN },
    { uuid: 'reply-1', parentId: THREAD_ID, senderId: CARLA },
    // eslint-disable-next-line unicorn/no-null
    { uuid: 'reply-2', parentId: THREAD_ID, senderId: null },
  ];
  reactions = [];
  existingChats = [];
  transactions = 0;
  writes = [];
});

describe('rate limits', () => {
  const limited: [string, number, (caller: Caller) => Promise<unknown>][] = [
    [
      'chat.sendMessage',
      20,
      (caller): Promise<unknown> =>
        caller.sendMessage({ chatId: CHAT_ID, content: 'Hoi zäme', timestamp: new Date() }),
    ],
    ['chat.reportProblem', 3, (caller): Promise<unknown> => caller.reportProblem()],
    ['chat.createChatInvite', 30, (caller): Promise<unknown> => caller.createChatInvite({})],
    [
      'chat.createChat',
      20,
      (caller): Promise<unknown> => caller.createChat({ members: [{ userId: BEN }] }),
    ],
  ];

  it.each(limited)('%s lets call number %i through', async (name, limit, call) => {
    rateLimitCounts.set(`rate-limit:${name}:${ANNA}`, limit - 1);

    expect(await errorOf(call(as(ANNA)))).toBeUndefined();
  });

  it.each(limited)(
    '%s turns the call after %i away, in German, before any database work',
    async (name, limit, call) => {
      rateLimitCounts.set(`rate-limit:${name}:${ANNA}`, limit);

      const error = await errorOf(call(as(ANNA)));

      expect(error?.code).toBe('TOO_MANY_REQUESTS');
      expect(error?.message).toMatch(/zu viele|mehrere/i);
      expect(transactions).toBe(0);
      expect(writes).toEqual([]);
      expect(mockSendNotification).not.toHaveBeenCalled();
    },
  );

  it('answers a French user in French', async () => {
    rateLimitCounts.set(`rate-limit:chat.sendMessage:${ANNA}`, 20);

    const error = await errorOf(
      as(ANNA, 'fr').sendMessage({ chatId: CHAT_ID, content: 'Salut', timestamp: new Date() }),
    );

    expect(error?.message).toMatch(/trop de messages/);
  });

  it('does not hold one user back for what another sent', async () => {
    rateLimitCounts.set(`rate-limit:chat.sendMessage:${ANNA}`, 20);

    expect(
      await errorOf(
        as(BEN).sendMessage({ chatId: CHAT_ID, content: 'Hoi', timestamp: new Date() }),
      ),
    ).toBeUndefined();
  });
});

describe('push notifications for a message', () => {
  it('reach every other member for a message in the chat itself', async () => {
    await as(ANNA).sendMessage({ chatId: CHAT_ID, content: 'Hoi zäme', timestamp: new Date() });

    expect(pushRecipients()).toEqual([[BEN, CARLA, DARIO]]);
  });

  it('reach only the thread author and earlier repliers for a thread reply', async () => {
    await as(ANNA).sendMessage({
      chatId: CHAT_ID,
      content: 'Ich komme mit',
      timestamp: new Date(),
      parentId: THREAD_ID,
    });

    expect(pushRecipients()).toEqual([[BEN, CARLA]]);
    // everyone still sees the reply live
    expect(mockPublish).toHaveBeenCalledTimes(1);
  });

  it('skip a thread participant who deleted the chat', async () => {
    memberships = [
      member(ANNA, ChatMembershipPermission.OWNER),
      member(BEN, ChatMembershipPermission.MEMBER, true),
      member(CARLA),
    ];

    await as(ANNA).sendMessage({
      chatId: CHAT_ID,
      content: 'Ich komme mit',
      timestamp: new Date(),
      parentId: THREAD_ID,
    });

    expect(pushRecipients()).toEqual([[CARLA]]);
  });

  it('are not sent for a reply in an announcement channel', async () => {
    chatType = ChatType.ANNOUNCEMENT;
    chatCapabilities = [ChatCapability.THREADS, ChatCapability.THREAD_REPLIES];
    memberships = [
      member(BEN, ChatMembershipPermission.OWNER),
      member(ANNA, ChatMembershipPermission.GUEST),
      member(CARLA, ChatMembershipPermission.GUEST),
    ];

    await as(ANNA).sendMessage({
      chatId: CHAT_ID,
      content: 'Wann ist der Tagesstart?',
      timestamp: new Date(),
      parentId: THREAD_ID,
    });

    expect(mockSendNotification).not.toHaveBeenCalled();
    expect(mockPublish).toHaveBeenCalledTimes(1);
  });
});

describe('image messages', () => {
  const sendImage = (content: string): Promise<unknown> =>
    as(ANNA).sendMessage({
      chatId: CHAT_ID,
      content,
      timestamp: new Date(),
      type: MessageType.IMAGE_MSG,
    });

  it('accept an image uploaded to this chat', async () => {
    expect(
      await errorOf(sendImage(`chat-images/${CHAT_ID}/1719830400000-k3j9x2.jpg`)),
    ).toBeUndefined();
  });

  it.each([
    ['an outside URL', 'https://tracker.example.test/pixel.gif'],
    ['an image of another chat', `chat-images/${OTHER_CHAT_ID}/1719830400000-k3j9x2.jpg`],
    ['a key stepping out of the chat', `chat-images/${CHAT_ID}/../${OTHER_CHAT_ID}/a.jpg`],
    ['another file in the bucket', 'bills/2027/rechnung.pdf'],
  ])('reject %s', async (_case, content) => {
    const error = await errorOf(sendImage(content));

    expect(error?.code).toBe('BAD_REQUEST');
    expect(writes).toEqual([]);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });
});

describe('reactions', () => {
  it('accept an emoji made of several code points', async () => {
    expect(
      await errorOf(as(ANNA).toggleReaction({ messageId: THREAD_ID, emoji: '👨‍👩‍👧‍👦' })),
    ).toBeUndefined();
  });

  it('reject anything longer than 16 characters', async () => {
    const error = await errorOf(
      as(ANNA).toggleReaction({ messageId: THREAD_ID, emoji: 'x'.repeat(17) }),
    );

    expect(error?.code).toBe('BAD_REQUEST');
    expect(writes).toEqual([]);
  });

  it('stop at six different emojis per person and message', async () => {
    reactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji, index) => ({
      uuid: `reaction-${index}`,
      userId: ANNA,
      emoji,
    }));

    const error = await errorOf(as(ANNA).toggleReaction({ messageId: THREAD_ID, emoji: '🎉' }));

    expect(error?.code).toBe('BAD_REQUEST');
    expect(error?.message).toContain('höchstens 6');
    expect(writes).toEqual([]);
  });

  it('still let a person at the cap take a reaction back', async () => {
    reactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji, index) => ({
      uuid: `reaction-${index}`,
      userId: ANNA,
      emoji,
    }));

    await as(ANNA).toggleReaction({ messageId: THREAD_ID, emoji: '👍' });

    expect(writes.map((write) => write.operation)).toEqual(['messageReaction.delete']);
  });

  it('count every person on their own', async () => {
    reactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji, index) => ({
      uuid: `reaction-${index}`,
      userId: BEN,
      emoji,
    }));

    expect(
      await errorOf(as(ANNA).toggleReaction({ messageId: THREAD_ID, emoji: '🎉' })),
    ).toBeUndefined();
  });
});

describe('chat names', () => {
  const longName = 'Abteilung Uster und Abteilung Züri 11 am Scharniertag';

  it('reject a group name longer than 50 characters, in German', async () => {
    expect(longName.length).toBeGreaterThan(50);

    const error = await errorOf(
      as(ANNA).createChat({ members: [{ userId: BEN }, { userId: CARLA }], chatName: longName }),
    );

    expect(error?.code).toBe('BAD_REQUEST');
    expect(error?.message).toContain('höchstens 50 Zeichen');
    expect(writes).toEqual([]);
  });

  it('accept a group name of exactly 50 characters', async () => {
    expect(
      await errorOf(
        as(ANNA).createChat({
          members: [{ userId: BEN }, { userId: CARLA }],
          chatName: 'x'.repeat(50),
        }),
      ),
    ).toBeUndefined();
  });

  it('reject a rename to a name longer than 50 characters', async () => {
    const error = await errorOf(as(ANNA).renameChat({ chatUuid: CHAT_ID, newName: longName }));

    expect(error?.code).toBe('BAD_REQUEST');
    expect(writes).toEqual([]);
  });

  it('store a rename without the surrounding whitespace', async () => {
    await as(ANNA).renameChat({ chatUuid: CHAT_ID, newName: '  Züri 11  ' });

    expect(writes).toEqual([{ operation: 'chat.update', data: { name: 'Züri 11' } }]);
  });

  it('reject a rename to only whitespace', async () => {
    const error = await errorOf(as(ANNA).renameChat({ chatUuid: CHAT_ID, newName: '   ' }));

    expect(error?.code).toBe('BAD_REQUEST');
  });
});

describe('adding participants', () => {
  it('is refused in a private chat, in German', async () => {
    chatType = ChatType.ONE_TO_ONE;
    memberships = [member(ANNA, ChatMembershipPermission.OWNER), member(BEN)];

    const error = await errorOf(
      as(ANNA).addParticipants({ chatId: CHAT_ID, participantIds: [CARLA] }),
    );

    expect(error?.code).toBe('BAD_REQUEST');
    expect(error?.message).toContain('privaten Chat');
    expect(writes).toEqual([]);
  });

  it('works in a group', async () => {
    memberships = [member(ANNA, ChatMembershipPermission.OWNER), member(BEN)];

    await as(ANNA).addParticipants({ chatId: CHAT_ID, participantIds: [CARLA] });

    expect(writes.map((write) => write.operation)).toEqual(['chatMembership.createMany']);
  });
});

describe('starting a private chat', () => {
  it('does not reuse a group that has the same two members', async () => {
    existingChats = [{ uuid: 'group-of-two', type: ChatType.GROUP }];

    const chatId = await as(ANNA).createChat({ members: [{ userId: BEN }] });

    expect(chatId).toBe('new-chat');
  });

  it('reuses the private chat the two already have', async () => {
    existingChats = [{ uuid: 'private-chat', type: ChatType.ONE_TO_ONE }];

    const chatId = await as(ANNA).createChat({ members: [{ userId: BEN }] });

    expect(chatId).toBe('private-chat');
  });
});
