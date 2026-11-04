import type { Context } from '@/trpc/init';
import { createCallerFactory, createTRPCRouter } from '@/trpc/init';

jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
const mockLoggedErrors: string[] = [];
jest.mock('@/utils/server-logger', () => ({
  createLogger: (): Record<string, (message: string) => void> => ({
    debug: (): void => {},
    info: (): void => {},
    warn: (): void => {},
    error: (message: string): void => {
      mockLoggedErrors.push(message);
    },
  }),
}));
// The pool outside the transaction. A send holds its transaction connection for as long as
// it runs, so every read it makes there needs a second one: it may read the pool only once
// it has committed.
const mockPoolReadsCommitted: boolean[] = [];
/** How many membership rows the send loaded, on either connection. */
let mockMembershipRowsLoaded: number;
const mockPoolRead = <T>(rows: T): Promise<T> => {
  mockPoolReadsCommitted.push(committed);
  if (mockPoolFails) return Promise.reject(new Error('Timed out fetching a new connection'));
  return Promise.resolve(rows);
};
interface MockMembership {
  userId: string;
  chatPermission: string;
  hasDeleted: boolean;
}
/** The members of the chat. Anna sends; Carla deleted the chat; Gast is a guest. */
let mockMembers: MockMembership[];
/** Who wrote in the thread a reply answers. */
let mockThreadSenderIds: string[];
/** Whether the pool is out of connections once the send has committed. */
let mockPoolFails: boolean;
jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: {
    chat: { findUnique: (): Promise<null> => mockPoolRead(null) },
    chatMembership: {
      findMany: ({
        where,
      }: {
        where: { hasDeleted?: boolean; userId: { not: string; in?: string[] } };
      }): Promise<{ userId: string }[]> =>
        mockPoolRead(
          mockMembers
            .filter(
              (member) =>
                (where.hasDeleted === undefined || member.hasDeleted === where.hasDeleted) &&
                member.userId !== where.userId.not &&
                (where.userId.in === undefined || where.userId.in.includes(member.userId)),
            )
            .map(({ userId }) => {
              mockMembershipRowsLoaded++;
              return { userId };
            }),
        ),
    },
    message: {
      findMany: (): Promise<{ senderId: string }[]> =>
        mockPoolRead(mockThreadSenderIds.map((senderId) => ({ senderId }))),
    },
  },
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
jest.mock('@/lib/db/redis', () => ({
  // every rate limit counter at its first call
  redis: { eval: (): Promise<number> => Promise.resolve(1) },
  getFeatureFlag: (): Promise<boolean> => Promise.resolve(true),
}));

/** Whether the transaction had committed when each side effect fired. */
let committed: boolean;
let failCommit: boolean;
const publishedAt: boolean[] = [];
const pushedAt: boolean[] = [];
/** What each push would say: its text and the sender it is prefixed with. */
const pushedTexts: { message: string; senderName: string | undefined }[] = [];
/** Whom each push would reach. */
const pushedRecipients: string[][] = [];
/** The members each send recorded a DISTRIBUTED event for. */
const distributedTo: string[][] = [];

jest.mock('@/lib/db/chat-pubsub', () => ({
  chatPubSub: {
    publish: (): Promise<void> => {
      publishedAt.push(committed);
      return Promise.resolve();
    },
  },
}));
jest.mock('@/lib/push/send-notification', () => ({
  sendNotification: (
    message: string,
    recipients: string[],
    _chatId: string,
    _messageId: string,
    options: { senderName?: string },
  ): Promise<{ success: boolean }> => {
    pushedAt.push(committed);
    pushedRecipients.push(recipients);
    pushedTexts.push({ message, senderName: options.senderName });
    return Promise.resolve({ success: true });
  },
}));

import { createMessage } from '@/features/chat/api/mutations/create-message';
import { ChatCapability, LARGE_CHAT_THRESHOLD } from '@/lib/chat-shared';
import { ChatMembershipPermission, ChatType, MessageType } from '@/lib/prisma/client';

const CHAT_ID = '00000000-0000-4000-8000-000000000001';

let storedTypes: MessageType[];
let storedPayloads: unknown[];
let storedParents: unknown[];

interface ExistingMessage {
  uuid: string;
  chatId: string;
  parentId: string | null;
  deletedAt: Date | null;
  /** Its newest content, a text unless given. */
  payload?: unknown;
}

const OTHER_CHAT_ID = '00000000-0000-4000-8000-000000000009';
const PARENT_ID = '00000000-0000-4000-8000-000000000002';
const parent: ExistingMessage = {
  uuid: PARENT_ID,
  chatId: CHAT_ID,
  parentId: null,
  deletedAt: null,
};
const otherChatMessage: ExistingMessage = {
  uuid: '00000000-0000-4000-8000-000000000003',
  chatId: OTHER_CHAT_ID,
  parentId: null,
  deletedAt: null,
};
const reply: ExistingMessage = {
  uuid: '00000000-0000-4000-8000-000000000004',
  chatId: CHAT_ID,
  parentId: PARENT_ID,
  deletedAt: null,
};
const deletedMessage: ExistingMessage = {
  uuid: '00000000-0000-4000-8000-000000000005',
  chatId: CHAT_ID,
  parentId: null,
  deletedAt: new Date('2027-07-25T10:00:00Z'),
};
const imageMessage: ExistingMessage = {
  uuid: '00000000-0000-4000-8000-000000000006',
  chatId: CHAT_ID,
  parentId: null,
  deletedAt: null,
  payload: { url: `chat-images/${CHAT_ID}/1719830400000-k3j9x2.jpg` },
};
const existingMessages = [parent, otherChatMessage, reply, deletedMessage, imageMessage];

/** Prisma's `findFirst` over the existing messages, for the equality filters a send uses. */
const findExistingMessage = ({
  where,
}: {
  where: Partial<ExistingMessage>;
}): Promise<(ExistingMessage & { contentVersions: unknown[] }) | null> => {
  const found = existingMessages.find((message) =>
    Object.entries(where).every(([key, value]) => message[key as keyof ExistingMessage] === value),
  );
  if (!found) return Promise.resolve(null);
  const payload = found.payload ?? { text: 'Wer kommt mit?' };
  return Promise.resolve({ ...found, contentVersions: [{ payload }] });
};

/** The rows the procedure touches, and a transaction that commits after the callback. */
const prisma = {
  $transaction: async <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => {
    const result = await callback(prisma);
    // Prisma's interactive transaction timeout fires between the last query and the
    // commit, which rolls back everything the callback wrote.
    if (failCommit)
      throw new Error('Transaction already closed: the timeout for this transaction was 5000 ms');
    committed = true;
    return result;
  },
  chat: {
    findUnique: ({
      select,
    }: {
      select: { chatMemberships: { where: { userId: string } } };
    }): Promise<unknown> =>
      Promise.resolve({
        name: 'Cevi Uster',
        type: chatType,
        capabilities: [
          ChatCapability.CAN_SEND_MESSAGES,
          ChatCapability.PICTURE_UPLOAD,
          ChatCapability.THREADS,
          ChatCapability.THREAD_REPLIES,
        ],
        // prisma answers a chat that was never archived with null
        archivedAt: null,
        chatMemberships: mockMembers.filter((member) => {
          if (member.userId !== select.chatMemberships.where.userId) return false;
          mockMembershipRowsLoaded++;
          return true;
        }),
      }),
    update: (): Promise<void> => Promise.resolve(),
  },
  chatMembership: {
    findMany: ({
      where,
      take,
    }: {
      where: { userId?: { not: string } };
      take: number;
    }): Promise<{ userId: string }[]> =>
      Promise.resolve(
        mockMembers
          .filter((member) => member.userId !== where.userId?.not)
          .slice(0, take)
          .map(({ userId }) => {
            mockMembershipRowsLoaded++;
            return { userId };
          }),
      ),
  },
  message: {
    findMany: (): Promise<unknown[]> => Promise.resolve([]),
    findFirst: findExistingMessage,
    findUnique: ({ where }: { where: { uuid: string } }): Promise<unknown> =>
      findExistingMessage({ where: { uuid: where.uuid } }),
    create: ({
      data,
    }: {
      data: {
        type: MessageType;
        contentVersions: { create: { payload: unknown }[] };
        parentId?: string;
      };
    }): Promise<unknown> => {
      storedTypes.push(data.type);
      storedPayloads.push(data.contentVersions.create[0]?.payload);
      storedParents.push(data.parentId);
      return Promise.resolve({ uuid: 'stored', createdAt: new Date(), type: data.type });
    },
  },
  messageEvent: {
    createMany: ({ data }: { data: { userId: string }[] }): Promise<void> => {
      distributedTo.push(data.map(({ userId }) => userId));
      return Promise.resolve();
    },
  },
};
let chatType: ChatType;

const createCaller = createCallerFactory(createTRPCRouter({ sendMessage: createMessage }));
const callerFor = (uuid: string, name: string): ReturnType<typeof createCaller> =>
  createCaller({
    user: { uuid, group_ids: [], name, email: `${uuid}@example.test` },
    prisma,
    locale: 'de',
  } as unknown as Context);
const anna = callerFor('anna', 'Anna');
const gast = callerFor('gast', 'Gast');
const stranger = callerFor('stranger', 'Stranger');

/** The push follows the commit after its own reads, so let those settle first. */
const afterCommitSettled = (): Promise<void> =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

const send = (type?: MessageType): Promise<unknown> =>
  anna.sendMessage({
    chatId: CHAT_ID,
    content: type === MessageType.IMAGE_MSG ? `chat-images/${CHAT_ID}/1-abc.jpg` : 'Hoi zäme',
    timestamp: new Date(),
    // cast, because the input type already rules out what the server has to reject
    ...(type === undefined ? {} : { type: type as typeof MessageType.TEXT_MSG }),
  });

beforeEach(() => {
  storedTypes = [];
  storedPayloads = [];
  storedParents = [];
  committed = false;
  failCommit = false;
  publishedAt.length = 0;
  pushedAt.length = 0;
  pushedTexts.length = 0;
  pushedRecipients.length = 0;
  distributedTo.length = 0;
  mockPoolReadsCommitted.length = 0;
  mockMembershipRowsLoaded = 0;
  mockPoolFails = false;
  mockLoggedErrors.length = 0;
  chatType = ChatType.GROUP;
  mockThreadSenderIds = ['ben'];
  mockMembers = [
    { userId: 'anna', chatPermission: ChatMembershipPermission.MEMBER, hasDeleted: false },
    { userId: 'ben', chatPermission: ChatMembershipPermission.MEMBER, hasDeleted: false },
    { userId: 'carla', chatPermission: ChatMembershipPermission.MEMBER, hasDeleted: true },
    { userId: 'gast', chatPermission: ChatMembershipPermission.GUEST, hasDeleted: false },
  ];
});

describe('the message types a participant can send', () => {
  it.each([MessageType.TEXT_MSG, MessageType.IMAGE_MSG, MessageType.LOCATION_MSG])(
    'stores a %s',
    async (type) => {
      await send(type);
      expect(storedTypes).toEqual([type]);
    },
  );

  it('stores a send without a type, as older offline outboxes queued it, as text', async () => {
    await send();
    expect(storedTypes).toEqual([MessageType.TEXT_MSG]);
  });

  it.each([MessageType.SYSTEM_MSG, MessageType.ALERT_QUESTION, MessageType.ALERT_RESPONSE])(
    'rejects a %s, which only server code creates',
    async (type) => {
      await expect(send(type)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
      expect(storedTypes).toEqual([]);
    },
  );
});

describe('the connections a send needs', () => {
  it.each([MessageType.TEXT_MSG, MessageType.IMAGE_MSG])(
    'checks what a %s may do on the connection of its transaction',
    async (type) => {
      await send(type);
      await afterCommitSettled();
      expect(mockPoolReadsCommitted).not.toContain(false);
    },
  );

  it('checks whether a thread reply is allowed on that connection too', async () => {
    await anna.sendMessage({
      chatId: CHAT_ID,
      content: 'Hoi zäme',
      timestamp: new Date(),
      parentId: PARENT_ID,
    });

    expect(storedTypes).toEqual([MessageType.TEXT_MSG]);
    await afterCommitSettled();
    expect(mockPoolReadsCommitted).not.toContain(false);
  });
});

describe('announcing a sent message', () => {
  it('happens exactly once, after the commit', async () => {
    await send();
    await afterCommitSettled();

    expect(publishedAt).toEqual([true]);
    expect(pushedAt).toEqual([true]);
  });

  it('does not happen when the transaction rolls back', async () => {
    failCommit = true;

    await expect(send()).rejects.toThrow('Transaction already closed');
    await afterCommitSettled();

    expect(publishedAt).toEqual([]);
    expect(pushedAt).toEqual([]);
  });
});

const sendText = (input: { parentId?: string; quotedMessageId?: string }): Promise<unknown> =>
  anna.sendMessage({ chatId: CHAT_ID, content: 'Ich!', timestamp: new Date(), ...input });

describe('what a reply and a quote may point at', () => {
  it.each([
    ['a message of the same chat', parent.uuid],
    ['a reply, as a thread opened from a thread', reply.uuid],
    ['a message deleted since, whose thread stays open', deletedMessage.uuid],
  ])('stores a reply to %s', async (_, parentId) => {
    await sendText({ parentId });
    expect(storedParents).toEqual([parentId]);
  });

  it('refuses a reply to a message of another chat, without a text for the user', async () => {
    const refusal = await sendText({ parentId: otherChatMessage.uuid }).catch(
      (error: unknown) => error,
    );

    expect(refusal).toMatchObject({ code: 'NOT_FOUND' });
    expect(refusal).not.toHaveProperty('reason');
    expect(storedTypes).toEqual([]);
    expect(publishedAt).toEqual([]);
    expect(pushedAt).toEqual([]);
  });

  it('says the thread is gone when its message no longer exists', async () => {
    await expect(
      sendText({ parentId: '00000000-0000-4000-8000-0000000000ff' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', reason: 'threadGone' });
    expect(storedTypes).toEqual([]);
  });

  it('stores a quote of a message of the same chat with its snippet', async () => {
    await sendText({ quotedMessageId: PARENT_ID });
    expect(storedPayloads).toEqual([
      { text: 'Ich!', quotedMessageId: PARENT_ID, quotedSnippet: 'Wer kommt mit?' },
    ]);
  });

  it('stores a quote of an image without a snippet, not its storage path', async () => {
    await sendText({ quotedMessageId: imageMessage.uuid });
    expect(storedPayloads).toEqual([{ text: 'Ich!', quotedMessageId: imageMessage.uuid }]);
  });

  it('keeps the quote of a message deleted since, but not its text', async () => {
    await sendText({ quotedMessageId: deletedMessage.uuid });
    expect(storedPayloads).toEqual([{ text: 'Ich!', quotedMessageId: deletedMessage.uuid }]);
  });

  it('keeps the quote of a message removed since', async () => {
    const removed = '00000000-0000-4000-8000-0000000000ff';
    await sendText({ quotedMessageId: removed });
    expect(storedPayloads).toEqual([{ text: 'Ich!', quotedMessageId: removed }]);
  });

  it('drops a quote of a message of another chat and still sends', async () => {
    await expect(sendText({ quotedMessageId: otherChatMessage.uuid })).resolves.toMatchObject({
      messagePayload: { text: 'Ich!' },
    });
    expect(storedPayloads).toEqual([{ text: 'Ich!' }]);
  });
});

describe('the text of the push', () => {
  it('is the message, prefixed with the sender', async () => {
    await send(MessageType.TEXT_MSG);
    await afterCommitSettled();

    expect(pushedTexts).toEqual([{ message: 'Hoi zäme', senderName: 'Anna' }]);
  });

  it('says who sent an image instead of showing where it is stored', async () => {
    await send(MessageType.IMAGE_MSG);
    await afterCommitSettled();

    expect(pushedTexts).toEqual([{ message: 'Anna hat ein Bild gesendet', senderName: undefined }]);
  });
});

describe('who may send', () => {
  it('refuses someone who is not a member, and stores nothing', async () => {
    await expect(
      stranger.sendMessage({ chatId: CHAT_ID, content: 'Hoi', timestamp: new Date() }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(storedTypes).toEqual([]);
  });

  it('lets a guest reply in a thread, but not write in the chat itself', async () => {
    await expect(
      gast.sendMessage({ chatId: CHAT_ID, content: 'Hoi', timestamp: new Date() }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await gast.sendMessage({
      chatId: CHAT_ID,
      content: 'Mir chömed!',
      timestamp: new Date(),
      parentId: PARENT_ID,
    });
    expect(storedParents).toEqual([PARENT_ID]);
  });
});

describe('who a message reaches', () => {
  it('pushes a message to every other member who still has the chat', async () => {
    await send();
    await afterCommitSettled();

    expect(pushedRecipients).toEqual([['ben', 'gast']]);
    expect(distributedTo).toEqual([['ben', 'carla', 'gast']]);
  });

  it('pushes a thread reply only to those who wrote in the thread', async () => {
    await sendText({ parentId: PARENT_ID });
    await afterCommitSettled();

    expect(pushedRecipients).toEqual([['ben']]);
  });

  it('pushes a reply in an announcement thread to nobody, without reading the members', async () => {
    chatType = ChatType.ANNOUNCEMENT;

    await gast.sendMessage({
      chatId: CHAT_ID,
      content: 'Mir chömed!',
      timestamp: new Date(),
      parentId: PARENT_ID,
    });
    await afterCommitSettled();

    expect(storedParents).toEqual([PARENT_ID]);
    expect(pushedRecipients).toEqual([]);
    expect(mockPoolReadsCommitted).toEqual([]);
    expect(publishedAt).toEqual([true]);
  });

  it('loads only a bounded share of a camp-wide channel for a guest reply', async () => {
    chatType = ChatType.ANNOUNCEMENT;
    mockMembers = [
      { userId: 'gast', chatPermission: ChatMembershipPermission.GUEST, hasDeleted: false },
      ...Array.from({ length: 4000 }, (_, index) => ({
        userId: `member-${index}`,
        chatPermission: ChatMembershipPermission.GUEST,
        hasDeleted: false,
      })),
    ];

    await gast.sendMessage({
      chatId: CHAT_ID,
      content: 'Mir chömed!',
      timestamp: new Date(),
      parentId: PARENT_ID,
    });
    await afterCommitSettled();

    expect(storedParents).toEqual([PARENT_ID]);
    // the sender's own membership, and the members it takes to tell the chat is large
    expect(mockMembershipRowsLoaded).toBeLessThanOrEqual(1 + LARGE_CHAT_THRESHOLD);
  });

  it('records no DISTRIBUTED events in a chat that reading it treats as large', async () => {
    // the sender and 127 others: exactly the size at which `markChatAsRead` stops writing
    // READ events, so a DISTRIBUTED tick here would never turn into a read one
    const others = Array.from({ length: LARGE_CHAT_THRESHOLD - 1 }, (_, index) => ({
      userId: `member-${index}`,
      chatPermission: ChatMembershipPermission.MEMBER,
      hasDeleted: false,
    }));
    mockMembers = [
      { userId: 'anna', chatPermission: ChatMembershipPermission.MEMBER, hasDeleted: false },
      ...others,
    ];

    await send();
    await afterCommitSettled();

    expect(distributedTo).toEqual([]);
    expect(pushedRecipients).toEqual([others.map(({ userId }) => userId)]);
  });

  it('still stores and publishes a message when its recipients cannot be read', async () => {
    mockPoolFails = true;

    await send();
    await afterCommitSettled();

    expect(storedTypes).toEqual([MessageType.TEXT_MSG]);
    expect(publishedAt).toEqual([true]);
    expect(pushedRecipients).toEqual([]);
    expect(mockLoggedErrors).toEqual(['Reading the push recipients failed']);
  });
});
