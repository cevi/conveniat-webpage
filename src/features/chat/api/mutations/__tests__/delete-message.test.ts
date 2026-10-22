import type { Context } from '@/trpc/init';
import { createCallerFactory, createTRPCRouter } from '@/trpc/init';

jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('payload', () => ({ getPayload: jest.fn() }));
jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));
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
const mockPublish = jest.fn().mockResolvedValue({});
jest.mock('@/lib/db/chat-pubsub', () => ({
  chatPubSub: { publish: (...args: unknown[]): unknown => mockPublish(...args) },
}));

import { deleteMessage } from '@/features/chat/api/mutations/delete-message';

const CHAT_ID = '0190a5b2-0000-7000-8000-000000000001';
const ANNA = 'anna';
const BEN = 'ben';
const OUTSIDER = 'outsider';
const MEMBERS = new Set([ANNA, BEN]);

interface StoredMessage {
  uuid: string;
  chatId: string;
  senderId: string | null;
  type: string;
  parentId: string | null;
  createdAt: Date;
  deletedAt: Date | null;
  deletedById: string | null;
}

let messages: StoredMessage[];
let reactions: { messageId: string; userId: string; emoji: string }[];

/* eslint-disable unicorn/no-null -- mirrors the Prisma rows */
const seed = (senderId: string | null, type = 'TEXT_MSG'): string => {
  const uuid = `00000000-0000-4000-8000-${String(messages.length).padStart(12, '0')}`;
  messages.push({
    uuid,
    chatId: CHAT_ID,
    senderId,
    type,
    parentId: null,
    createdAt: new Date(2027, 6, 25, 10, messages.length),
    deletedAt: null,
    deletedById: null,
  });
  return uuid;
};

const prisma = {
  $transaction: <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => callback(prisma),
  message: {
    findFirst: ({
      where,
    }: {
      where: { uuid: string; chat: { chatMemberships: { some: { userId: string } } } };
    }): Promise<StoredMessage | null> => {
      const message = messages.find((m) => m.uuid === where.uuid);
      const isMember = MEMBERS.has(where.chat.chatMemberships.some.userId);
      return Promise.resolve(message !== undefined && isMember ? { ...message } : null);
    },
    findUniqueOrThrow: ({ where }: { where: { uuid: string } }): Promise<StoredMessage> => {
      const message = messages.find((m) => m.uuid === where.uuid);
      if (message === undefined) throw new Error('not found');
      return Promise.resolve({ ...message });
    },
    updateMany: ({
      where,
      data,
    }: {
      where: { uuid: string; deletedAt: null };
      data: { deletedAt: Date; deletedById: string };
    }): Promise<{ count: number }> => {
      const message = messages.find((m) => m.uuid === where.uuid && m.deletedAt === null);
      if (message === undefined) return Promise.resolve({ count: 0 });
      message.deletedAt = data.deletedAt;
      message.deletedById = data.deletedById;
      return Promise.resolve({ count: 1 });
    },
  },
  messageReaction: {
    deleteMany: ({ where }: { where: { messageId: string } }): Promise<{ count: number }> => {
      const before = reactions.length;
      reactions = reactions.filter((reaction) => reaction.messageId !== where.messageId);
      return Promise.resolve({ count: before - reactions.length });
    },
  },
};
/* eslint-enable unicorn/no-null */

const createCaller = createCallerFactory(createTRPCRouter({ deleteMessage }));
const as = (uuid: string): ReturnType<typeof createCaller> =>
  createCaller({
    user: { uuid, group_ids: [], name: `Name of ${uuid}`, email: `${uuid}@example.test` },
    prisma,
    locale: 'de',
  } as unknown as Context);

const stored = (uuid: string): StoredMessage | undefined => messages.find((m) => m.uuid === uuid);

beforeEach(() => {
  messages = [];
  reactions = [];
  mockPublish.mockClear();
});

describe('deleteMessage', () => {
  it('lets the sender delete their message for everyone, and takes its reactions with it', async () => {
    const messageId = seed(ANNA);
    reactions.push({ messageId, userId: BEN, emoji: '👍' });

    const { deletedAt } = await as(ANNA).deleteMessage({ messageId });

    expect(stored(messageId)).toMatchObject({ deletedAt, deletedById: ANNA });
    expect(reactions).toEqual([]);
    expect(mockPublish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'message_deleted',
        chatId: CHAT_ID,
        message: expect.objectContaining({
          id: messageId,
          messagePayload: {},
          deletedAt,
        }) as unknown,
      }),
    );
  });

  it('keeps the message itself, so its thread and the quotes of it keep their place', async () => {
    const messageId = seed(ANNA);

    await as(ANNA).deleteMessage({ messageId });

    expect(stored(messageId)).toBeDefined();
  });

  it('refuses everyone but the sender, even another member', async () => {
    const messageId = seed(ANNA);

    await expect(as(BEN).deleteMessage({ messageId })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(stored(messageId)?.deletedAt).toBeNull();
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('tells someone outside the chat nothing about the message', async () => {
    const messageId = seed(ANNA);

    await expect(as(OUTSIDER).deleteMessage({ messageId })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('does not let a reporter take back the questions of their alert', async () => {
    const messageId = seed(ANNA, 'ALERT_QUESTION');

    await expect(as(ANNA).deleteMessage({ messageId })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('changes nothing the second time and answers with the first time', async () => {
    const messageId = seed(ANNA);
    const first = await as(ANNA).deleteMessage({ messageId });

    const second = await as(ANNA).deleteMessage({ messageId });

    expect(second.deletedAt).toEqual(first.deletedAt);
    expect(mockPublish).toHaveBeenCalledTimes(1);
  });
});
