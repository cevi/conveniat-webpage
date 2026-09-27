import type { Context } from '@/trpc/init';
import { createCallerFactory, createTRPCRouter } from '@/trpc/init';
import { TRPCError } from '@trpc/server';

jest.mock('@payload-config', () => ({}), { virtual: true });
// No alert question follows, so an answer ends after storing it.
jest.mock('payload', () => ({
  getPayload: (): Promise<unknown> =>
    Promise.resolve({ findGlobal: (): Promise<unknown> => Promise.resolve({ questions: [] }) }),
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
// `update-message-content` reads the enum from the package, which only the generated
// `@/lib/prisma` client provides here.
jest.mock('@prisma/client', () => ({
  MessageType: { ALERT_QUESTION: 'ALERT_QUESTION', ALERT_RESPONSE: 'ALERT_RESPONSE' },
}));
jest.mock('@/lib/db/redis', () => ({
  getFeatureFlag: (): Promise<boolean> => Promise.resolve(true),
}));
// The capability check reads the chat through the shared client, the procedures through the
// transaction; both see the same tables.
jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  get default(): unknown {
    return mockPrisma;
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
import { createMessage } from '@/features/chat/api/mutations/create-message';
import { renameChat } from '@/features/chat/api/mutations/rename-chat';
import { signalTyping } from '@/features/chat/api/mutations/signal-typing';
import { toggleReaction } from '@/features/chat/api/mutations/toggle-reaction';
import { updateMessageContent } from '@/features/chat/api/mutations/update-message-content';
import { ChatCapability } from '@/lib/chat-shared';
import { ChatMembershipPermission, ChatStatus, ChatType, MessageType } from '@/lib/prisma';

const CHAT_ID = '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b';
const MESSAGE_ID = '0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d';

interface Membership {
  userId: string;
  chatId: string;
  hasDeleted: boolean;
  chatPermission: ChatMembershipPermission;
}

let archivedAt: Date | null;
let memberships: Membership[];
/** The chat owner every call runs as, fresh per test so the typing rate limit never kicks in. */
let owner: string;
let ownerCount = 0;
/** Every write that reached the database, by table and operation. */
let writes: string[];

const chatRow = (where: { uuid: string }, membershipWhere?: { userId: string }): unknown =>
  where.uuid === CHAT_ID
    ? {
        uuid: CHAT_ID,
        name: 'Cevi Uster',
        type: ChatType.GROUP,
        status: ChatStatus.OPEN,
        capabilities: [ChatCapability.CAN_SEND_MESSAGES, ChatCapability.EMOJI_REACTIONS],
        archivedAt,
        createdAt: new Date(0),
        lastUpdate: new Date(0),
        chatMemberships: memberships.filter(
          (m) => membershipWhere === undefined || m.userId === membershipWhere.userId,
        ),
      }
    : // eslint-disable-next-line unicorn/no-null
      null;

const record =
  (write: string, result: unknown = {}) =>
  (): Promise<unknown> => {
    writes.push(write);
    return Promise.resolve(result);
  };

/** The chat tables, with just enough of Prisma's behaviour for the write procedures. */
const mockPrisma = {
  $transaction: <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => callback(mockPrisma),
  $executeRaw: (): Promise<number> => Promise.resolve(1),
  chat: {
    findUnique: ({
      where,
      select,
    }: {
      where: { uuid: string };
      select?: { chatMemberships?: { where?: { userId: string } } };
    }): Promise<unknown> => Promise.resolve(chatRow(where, select?.chatMemberships?.where)),
    findUniqueOrThrow: ({ where }: { where: { uuid: string } }): Promise<unknown> => {
      const chat = chatRow(where);
      return chat === null ? Promise.reject(new Error('No Chat found')) : Promise.resolve(chat);
    },
    update: record('chat.update'),
  },
  chatMembership: { createMany: record('chatMembership.createMany') },
  message: {
    findUnique: (): Promise<unknown> =>
      Promise.resolve({
        uuid: MESSAGE_ID,
        chatId: CHAT_ID,
        senderId: owner,
        // An alert question, the only message `updateMessageContent` changes; the other
        // procedures do not care about the type.
        type: MessageType.ALERT_QUESTION,
        createdAt: new Date(0),
        parentId: undefined,
        contentVersions: [
          {
            revision: 0,
            payload: {
              question: 'Ist jemand verletzt?',
              options: [{ id: 'o-no', option: 'Nein' }],
            },
          },
        ],
      }),
    findFirst: (): Promise<unknown> => Promise.resolve({ uuid: MESSAGE_ID }),
    create: record('message.create', { uuid: 'new-message', createdAt: new Date() }),
  },
  messageContent: { create: record('messageContent.create') },
  messageEvent: { createMany: record('messageEvent.createMany') },
  messageReaction: {
    // eslint-disable-next-line unicorn/no-null
    findUnique: (): Promise<null> => Promise.resolve(null),
    create: record('messageReaction.create'),
    delete: record('messageReaction.delete'),
  },
};

const createCaller = createCallerFactory(
  createTRPCRouter({
    createMessage,
    signalTyping,
    toggleReaction,
    updateMessageContent,
    addParticipants,
    renameChat,
  }),
);
type Caller = ReturnType<typeof createCaller>;

const as = (uuid: string): Caller =>
  createCaller({
    user: { uuid, group_ids: [], name: `Name of ${uuid}`, email: `${uuid}@example.test` },
    prisma: mockPrisma,
    locale: 'de',
  } as unknown as Context);

const member = (
  userId: string,
  chatPermission: ChatMembershipPermission,
  hasDeleted = false,
): Membership => ({ userId, chatId: CHAT_ID, hasDeleted, chatPermission });

type WriteCall = (caller: Caller) => Promise<unknown>;

/** Every procedure that changes an existing chat, called by its owner. */
const writeProcedures: [string, WriteCall][] = [
  [
    'createMessage',
    (caller): Promise<unknown> =>
      caller.createMessage({ chatId: CHAT_ID, content: 'Hoi zäme', timestamp: new Date() }),
  ],
  ['signalTyping', (caller): Promise<unknown> => caller.signalTyping({ chatId: CHAT_ID })],
  [
    'toggleReaction',
    (caller): Promise<unknown> => caller.toggleReaction({ messageId: MESSAGE_ID, emoji: '👍' }),
  ],
  [
    'updateMessageContent',
    (caller): Promise<unknown> =>
      caller.updateMessageContent({ messageId: MESSAGE_ID, content: { selectedOption: 'Nein' } }),
  ],
  [
    'addParticipants',
    (caller): Promise<unknown> =>
      caller.addParticipants({ chatId: CHAT_ID, participantIds: ['ben'] }),
  ],
  [
    'renameChat',
    (caller): Promise<unknown> => caller.renameChat({ chatUuid: CHAT_ID, newName: 'Züri 11' }),
  ],
];

beforeEach(() => {
  jest.clearAllMocks();
  // eslint-disable-next-line unicorn/no-null
  archivedAt = null;
  writes = [];
  owner = `owner-${++ownerCount}`;
  memberships = [
    member(owner, ChatMembershipPermission.OWNER),
    member('carla', ChatMembershipPermission.MEMBER),
  ];
});

describe.each(writeProcedures)('%s', (_name, call) => {
  it('goes through in a chat that is not archived', async () => {
    await expect(call(as(owner))).resolves.not.toThrow();
  });

  it('rejects an archived chat with FORBIDDEN and writes nothing', async () => {
    archivedAt = new Date(Date.now() - 60_000);

    const error: unknown = await call(as(owner)).catch((error_: unknown) => error_);

    expect(error).toBeInstanceOf(TRPCError);
    expect((error as TRPCError).code).toBe('FORBIDDEN');
    expect(writes).toEqual([]);
    expect(mockPublish).not.toHaveBeenCalled();
    expect(mockSendNotification).not.toHaveBeenCalled();
  });
});

describe('push fan-out', () => {
  it('skips members who deleted the chat', async () => {
    memberships.push(member('dario', ChatMembershipPermission.MEMBER, true));

    await as(owner).createMessage({ chatId: CHAT_ID, content: 'Hoi', timestamp: new Date() });

    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    const recipients = (mockSendNotification.mock.calls as unknown[][])[0]?.[1];
    expect(recipients).toEqual(['carla']);
  });
});
