import type { Context } from '@/trpc/init';
import { createCallerFactory, createTRPCRouter } from '@/trpc/init';
import { TRPCError } from '@trpc/server';

/** What the `all-chats-management` global holds, as an editor saved it. */
let chatSettings: { maxGroupMembers?: number };

jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('payload', () => ({
  getPayload: (): Promise<unknown> =>
    Promise.resolve({ findGlobal: (): Promise<unknown> => Promise.resolve(chatSettings) }),
}));
jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
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
jest.mock('@prisma/client', () => ({
  ChatMembershipPermission: { OWNER: 'OWNER' },
  ChatType: { GROUP: 'GROUP', ONE_TO_ONE: 'ONE_TO_ONE' },
  MessageEventType: { CREATED: 'CREATED', STORED: 'STORED' },
  MessageType: { SYSTEM_MSG: 'SYSTEM_MSG' },
}));
jest.mock('@/lib/db/redis', () => ({
  getFeatureFlag: (): Promise<boolean> => Promise.resolve(true),
}));
jest.mock('@/lib/db/chat-pubsub', () => ({
  chatPubSub: { publish: (): Promise<void> => Promise.resolve() },
}));

import { addParticipants } from '@/features/chat/api/mutations/add-participants';
import { createChat } from '@/features/chat/api/mutations/create-chat';
import { ChatMembershipPermission, ChatType } from '@/lib/prisma';

const CHAT_ID = '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b';
const OWNER = 'aaaaaaaaaaaaaaaaaaaaaaaa';
/** Valid user ids, as the create input requires them. */
const people = ['b', 'c', 'd', 'e'].map((letter) => letter.repeat(24));

let chatType: ChatType;
let memberIds: string[];
/** Every write that reached the database. */
let writes: string[];

const mockPrisma = {
  $transaction: <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => callback(mockPrisma),
  chat: {
    findUniqueOrThrow: (): Promise<unknown> =>
      Promise.resolve({
        uuid: CHAT_ID,
        name: 'Cevi Uster',
        type: chatType,
        archivedAt: undefined,
        createdAt: new Date(0),
        lastUpdate: new Date(0),
        chatMemberships: memberIds.map((userId) => ({
          userId,
          chatId: CHAT_ID,
          hasDeleted: false,
          chatPermission:
            userId === OWNER ? ChatMembershipPermission.OWNER : ChatMembershipPermission.MEMBER,
        })),
      }),
    create: (): Promise<unknown> => {
      writes.push('chat.create');
      return Promise.resolve({ uuid: CHAT_ID });
    },
  },
  chatMembership: {
    createMany: ({ data }: { data: unknown[] }): Promise<unknown> => {
      writes.push(`chatMembership.createMany(${data.length})`);
      return Promise.resolve({ count: data.length });
    },
  },
};

const caller = createCallerFactory(createTRPCRouter({ createChat, addParticipants }))({
  user: { uuid: OWNER, group_ids: [], name: 'Owner', email: 'owner@example.test' },
  prisma: mockPrisma,
  locale: 'de',
} as unknown as Context);

const rejection = (call: Promise<unknown>): Promise<unknown> =>
  call.then(
    () => 'resolved',
    (error: unknown) => error,
  );

const create = (count: number): Promise<unknown> =>
  caller.createChat({
    chatName: 'Züri 11',
    members: people.slice(0, count).map((userId) => ({ userId })),
  });

const add = (participantIds: string[]): Promise<unknown> =>
  caller.addParticipants({ chatId: CHAT_ID, participantIds });

beforeEach(() => {
  chatSettings = { maxGroupMembers: 3 };
  chatType = ChatType.GROUP;
  memberIds = [OWNER, people[0] ?? ''];
  writes = [];
});

describe('createChat', () => {
  it('creates a group that reaches the limit, the creator included', async () => {
    await create(2);

    expect(writes).toEqual(['chat.create']);
  });

  it('refuses a group past the limit in the user’s language and writes nothing', async () => {
    const error = await rejection(create(3));

    expect(error).toBeInstanceOf(TRPCError);
    expect((error as TRPCError).code).toBe('BAD_REQUEST');
    expect((error as TRPCError).message).toBe('Eine Gruppe hat höchstens 3 Mitglieder.');
    expect(writes).toEqual([]);
  });

  it('allows 32 members while the setting was never saved', async () => {
    chatSettings = {};

    await create(4);

    expect(writes).toEqual(['chat.create']);
  });
});

describe('addParticipants', () => {
  it('adds people up to the limit', async () => {
    await add([people[1] ?? '']);

    expect(writes).toEqual(['chatMembership.createMany(1)']);
  });

  it('counts a person selected twice once', async () => {
    await add([people[1] ?? '', people[1] ?? '']);

    expect(writes).toEqual(['chatMembership.createMany(1)']);
  });

  it('refuses to grow a group past the limit and writes nothing', async () => {
    const error = await rejection(add([people[1] ?? '', people[2] ?? '']));

    expect(error).toBeInstanceOf(TRPCError);
    expect((error as TRPCError).code).toBe('BAD_REQUEST');
    expect((error as TRPCError).message).toBe('Eine Gruppe hat höchstens 3 Mitglieder.');
    expect(writes).toEqual([]);
  });

  it('leaves chats that are not participant groups unlimited', async () => {
    chatType = ChatType.SUPPORT_GROUP;

    await add([people[1] ?? '', people[2] ?? '', people[3] ?? '']);

    expect(writes).toEqual(['chatMembership.createMany(3)']);
  });
});
