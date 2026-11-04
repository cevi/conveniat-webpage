import type { Context } from '@/trpc/init';
import { createCallerFactory, createTRPCRouter } from '@/trpc/init';

jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
// The pool outside the transaction. A send holds its transaction connection for as long as
// it runs, so every read it makes here needs a second one.
const mockPoolRead = jest.fn();
jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: { chat: { findUnique: (): unknown => mockPoolRead() } },
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
    _recipients: string[],
    _chatId: string,
    _messageId: string,
    options: { senderName?: string },
  ): Promise<{ success: boolean }> => {
    pushedAt.push(committed);
    pushedTexts.push({ message, senderName: options.senderName });
    return Promise.resolve({ success: true });
  },
}));

import { createMessage } from '@/features/chat/api/mutations/create-message';
import { ChatCapability } from '@/lib/chat-shared';
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
const existingMessages = [parent, otherChatMessage, reply, deletedMessage];

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
  return Promise.resolve({ ...found, contentVersions: [{ payload: { text: 'Wer kommt mit?' } }] });
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
    findUnique: (): Promise<unknown> =>
      Promise.resolve({
        name: 'Cevi Uster',
        type: ChatType.GROUP,
        capabilities: [
          ChatCapability.CAN_SEND_MESSAGES,
          ChatCapability.PICTURE_UPLOAD,
          ChatCapability.THREADS,
        ],
        // prisma answers a chat that was never archived with null
        archivedAt: null,
      }),
    update: (): Promise<void> => Promise.resolve(),
  },
  chatMembership: {
    findMany: (): Promise<unknown> =>
      Promise.resolve([
        { userId: 'anna', chatPermission: ChatMembershipPermission.MEMBER },
        { userId: 'ben', chatPermission: ChatMembershipPermission.MEMBER },
      ]),
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
  messageEvent: { createMany: (): Promise<void> => Promise.resolve() },
};

const createCaller = createCallerFactory(createTRPCRouter({ sendMessage: createMessage }));
const anna = createCaller({
  user: { uuid: 'anna', group_ids: [], name: 'Anna', email: 'anna@example.test' },
  prisma,
  locale: 'de',
} as unknown as Context);

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
  mockPoolRead.mockClear();
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
      expect(mockPoolRead).not.toHaveBeenCalled();
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
    expect(mockPoolRead).not.toHaveBeenCalled();
  });
});

describe('announcing a sent message', () => {
  it('happens exactly once, after the commit', async () => {
    await send();

    expect(publishedAt).toEqual([true]);
    expect(pushedAt).toEqual([true]);
  });

  it('does not happen when the transaction rolls back', async () => {
    failCommit = true;

    await expect(send()).rejects.toThrow('Transaction already closed');

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

    expect(pushedTexts).toEqual([{ message: 'Hoi zäme', senderName: 'Anna' }]);
  });

  it('says who sent an image instead of showing where it is stored', async () => {
    await send(MessageType.IMAGE_MSG);

    expect(pushedTexts).toEqual([{ message: 'Anna hat ein Bild gesendet', senderName: undefined }]);
  });
});
