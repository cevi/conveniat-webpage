import type { Context } from '@/trpc/init';
import { createCallerFactory, createTRPCRouter } from '@/trpc/init';

jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('payload', () => ({ getPayload: jest.fn() }));
jest.mock('@/config/environment-variables', () => ({ environmentVariables: {} }));
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
jest.mock('@prisma/client', () =>
  jest.requireActual<typeof import('@/lib/prisma')>('@/lib/prisma'),
);
jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/db/redis', () => ({
  redis: { eval: (): Promise<number> => Promise.resolve(1) },
}));
jest.mock('@/lib/db/chat-pubsub', () => ({
  chatPubSub: { publish: (): Promise<void> => Promise.resolve() },
}));
jest.mock('@/features/chat/api/utils/piket-service', () => ({
  getActivePiketMembers: (): Promise<unknown[]> => Promise.resolve([{ id: 'lea', name: 'Lea' }]),
}));
const sendNotification = jest.fn<Promise<unknown>, unknown[]>(() => Promise.resolve({}));
jest.mock('@/lib/push/send-notification', () => ({
  sendNotification: (...arguments_: unknown[]): unknown => sendNotification(...arguments_),
}));

import { reportProblem } from '@/features/chat/api/mutations/report-problem';

interface CreatedMessage {
  senderId?: string;
  type: string;
  contentVersions: { create: { payload: unknown } };
}

let chats: { name: string }[];
let messages: CreatedMessage[];

const prisma = {
  $transaction: <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => callback(prisma),
  user: { upsert: (): Promise<void> => Promise.resolve() },
  chat: {
    create: ({ data }: { data: { name: string } }): Promise<unknown> => {
      chats.push(data);
      return Promise.resolve({ uuid: 'report-chat', name: data.name });
    },
  },
  message: {
    create: ({ data }: { data: CreatedMessage }): Promise<unknown> => {
      messages.push(data);
      return Promise.resolve({ uuid: `message-${messages.length}`, createdAt: new Date() });
    },
  },
};

const caller = createCallerFactory(createTRPCRouter({ reportProblem }))({
  user: { uuid: 'noah', group_ids: [], name: 'Noah v/o Biber', email: 'noah@example.test' },
  prisma,
  locale: 'de',
} as unknown as Context);

beforeEach(() => {
  chats = [];
  messages = [];
  sendNotification.mockClear();
});

describe('a private report from the forum composer', () => {
  it('names the chat after its title and opens it with what the reporter wrote', async () => {
    await caller.reportProblem({
      title: 'Jemand schläft im Materialzelt',
      text: 'Seit zwei Nächten, ich will das nicht öffentlich schreiben.',
      location: [8.3042, 46.5043],
    });
    await new Promise((resolve) => setImmediate(resolve));

    expect(chats[0]?.name).toBe('Jemand schläft im Materialzelt');
    expect(messages.map((message) => message.type)).toEqual(['SYSTEM_MSG', 'TEXT_MSG']);
    expect(messages[1]).toEqual(
      expect.objectContaining({
        senderId: 'noah',
        contentVersions: {
          create: {
            payload: {
              text: 'Jemand schläft im Materialzelt\n\nSeit zwei Nächten, ich will das nicht öffentlich schreiben.',
            },
          },
        },
      }),
    );
    expect(sendNotification).toHaveBeenCalledWith(
      'Neuer Problem-Bericht von Noah v/o Biber! Jemand schläft im Materialzelt',
      ['lea'],
      'report-chat',
      undefined,
      expect.anything(),
    );
  });

  it('keeps the report of the map without a text as it was', async () => {
    await caller.reportProblem({ location: [8.3042, 46.5043] });

    expect(chats[0]?.name).toMatch(/^Problem Report - /);
    expect(messages.map((message) => message.type)).toEqual(['SYSTEM_MSG']);
  });
});
