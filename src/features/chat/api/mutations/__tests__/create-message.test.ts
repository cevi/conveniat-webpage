import type { Context } from '@/trpc/init';
import { createCallerFactory, createTRPCRouter } from '@/trpc/init';

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
jest.mock('@/lib/db/redis', () => ({
  // every rate limit counter at its first call
  redis: { eval: (): Promise<number> => Promise.resolve(1) },
}));
jest.mock('@/lib/ability', () => ({
  Ability: { can: (): Promise<boolean> => Promise.resolve(true) },
}));

/** Whether the transaction had committed when each side effect fired. */
let committed: boolean;
let failCommit: boolean;
const publishedAt: boolean[] = [];
const pushedAt: boolean[] = [];

jest.mock('@/lib/db/chat-pubsub', () => ({
  chatPubSub: {
    publish: (): Promise<void> => {
      publishedAt.push(committed);
      return Promise.resolve();
    },
  },
}));
jest.mock('@/lib/push/send-notification', () => ({
  sendNotification: (): Promise<{ success: boolean }> => {
    pushedAt.push(committed);
    return Promise.resolve({ success: true });
  },
}));

import { createMessage } from '@/features/chat/api/mutations/create-message';
import { ChatMembershipPermission, ChatType, MessageType } from '@/lib/prisma/client';

const CHAT_ID = '00000000-0000-4000-8000-000000000001';

let storedTypes: MessageType[];

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
        capabilities: [],
        chatMemberships: [
          { userId: 'anna', chatPermission: ChatMembershipPermission.MEMBER },
          { userId: 'ben', chatPermission: ChatMembershipPermission.MEMBER },
        ],
      }),
    update: (): Promise<void> => Promise.resolve(),
  },
  message: {
    create: ({ data }: { data: { type: MessageType } }): Promise<unknown> => {
      storedTypes.push(data.type);
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
  committed = false;
  failCommit = false;
  publishedAt.length = 0;
  pushedAt.length = 0;
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
