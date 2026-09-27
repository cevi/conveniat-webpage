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
jest.mock('@/features/chat/api/checks/assert-can-write-in-chat', () => ({
  assertWriteAbilities: (): Promise<void> => Promise.resolve(),
  assertMembershipCanWrite: (): void => {},
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
jest.mock('@/features/chat/api/utils/send-push-notifications', () => ({
  sendNotification: (): Promise<{ success: boolean }> => {
    pushedAt.push(committed);
    return Promise.resolve({ success: true });
  },
}));

import { createMessage } from '@/features/chat/api/mutations/create-message';
import { ChatType } from '@/lib/prisma';

const CHAT_ID = '4f1c2a9e-3b7d-4e8a-9c51-0d6e2f8a1b34';

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
          { userId: 'anna', chatPermission: 'MEMBER' },
          { userId: 'ben', chatPermission: 'MEMBER' },
        ],
      }),
    update: (): Promise<void> => Promise.resolve(),
  },
  message: {
    create: (): Promise<unknown> =>
      Promise.resolve({ uuid: 'message-1', createdAt: new Date(0), type: 'TEXT_MSG' }),
  },
  messageEvent: {
    createMany: (): Promise<void> => Promise.resolve(),
  },
};

const createCaller = createCallerFactory(createTRPCRouter({ createMessage }));
const anna = createCaller({
  user: { uuid: 'anna', group_ids: [], name: 'Anna', email: 'anna@example.test' },
  prisma,
  locale: 'de',
} as unknown as Context);

const send = (): Promise<unknown> =>
  anna.createMessage({ chatId: CHAT_ID, content: 'Hoi zäme', timestamp: new Date(0) });

beforeEach(() => {
  committed = false;
  failCommit = false;
  publishedAt.length = 0;
  pushedAt.length = 0;
});

describe('sending a message', () => {
  it('announces it exactly once, after the commit', async () => {
    await send();

    expect(publishedAt).toEqual([true]);
    expect(pushedAt).toEqual([true]);
  });

  it('announces nothing when the transaction rolls back', async () => {
    failCommit = true;

    await expect(send()).rejects.toThrow('Transaction already closed');

    expect(publishedAt).toEqual([]);
    expect(pushedAt).toEqual([]);
  });
});
