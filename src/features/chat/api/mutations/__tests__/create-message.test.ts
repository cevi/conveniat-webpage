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
jest.mock('@/lib/ability', () => ({
  Ability: { can: (): Promise<boolean> => Promise.resolve(true) },
}));
jest.mock('@/lib/db/chat-pubsub', () => ({
  chatPubSub: { publish: (): Promise<void> => Promise.resolve() },
}));
jest.mock('@/features/chat/api/utils/send-push-notifications', () => ({
  sendNotification: (): Promise<void> => Promise.resolve(),
}));

import { createMessage } from '@/features/chat/api/mutations/create-message';
import { ChatMembershipPermission, ChatType, MessageType } from '@/lib/prisma/client';

const CHAT_ID = '00000000-0000-4000-8000-000000000001';

let storedTypes: MessageType[];

const prisma = {
  $transaction: <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => callback(prisma),
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
    content: 'Hoi zäme',
    timestamp: new Date(),
    // cast, because the input type already rules out what the server has to reject
    ...(type === undefined ? {} : { type: type as typeof MessageType.TEXT_MSG }),
  });

beforeEach(() => {
  storedTypes = [];
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
