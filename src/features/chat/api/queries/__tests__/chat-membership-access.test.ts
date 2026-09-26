import type { Context } from '@/trpc/init';
import { createCallerFactory, createTRPCRouter } from '@/trpc/init';

jest.mock('@payload-config', () => ({}), { virtual: true });

// Without Payload the chat name falls back to the Postgres user names, which is all this needs.
jest.mock('payload', () => ({
  getPayload: jest.fn().mockRejectedValue(new Error('no payload in this test')),
}));
jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));
// `get-message.ts` takes the enum from the generated client; the values are all it needs.
jest.mock('@prisma/client', () => ({ MessageEventType: { READ: 'READ', STORED: 'STORED' } }));
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [],
    CEVIDB_GROUP_WEB_CORE_TEAM: [],
    CEVIDB_GROUP_TRANSLATION_TEAM: [],
    CEVIDB_GROUP_PROGRAM_TEAM: [],
  },
}));
jest.mock('@/utils/get-locale-from-cookies', () => ({
  getLocaleFromCookies: jest.fn().mockResolvedValue('de'),
}));

// `superjson` ships untranspiled ESM and is only the wire transformer; a direct caller never
// serializes anything, so a stub keeps this suite out of the ESM transform allowlist.
jest.mock('superjson', () => ({
  __esModule: true,
  default: {
    serialize: (value: unknown): { json: unknown } => ({ json: value }),
    deserialize: (value: { json: unknown }): unknown => value.json,
  },
}));

import { getChat } from '@/features/chat/api/queries/get-chat';
import { getMessage } from '@/features/chat/api/queries/get-message';

const CHAT_ID = '0190a5b2-0000-7000-8000-000000000001';
const MESSAGE_ID = 'message-1';

const member = { uuid: 'member-1', group_ids: [], name: 'Member', email: 'm@example.test' };
const outsider = { uuid: 'outsider-1', group_ids: [], name: 'Outsider', email: 'o@example.test' };

const chatUser = (uuid: string): Record<string, unknown> => ({
  uuid,
  name: `Name of ${uuid}`,
  description: undefined,
  lastSeen: new Date(0),
});

const chatMemberships = [
  { userId: member.uuid, chatPermission: 'MEMBER', user: chatUser(member.uuid) },
  { userId: 'someone-else', chatPermission: 'MEMBER', user: chatUser('someone-else') },
];

const message = {
  uuid: MESSAGE_ID,
  chatId: CHAT_ID,
  createdAt: new Date(0),
  senderId: 'someone-else',
  sender: { name: 'Name of someone-else' },
  type: 'TEXT_MSG',
  parentId: undefined,
  messageEvents: [],
  contentVersions: [{ payload: { de: 'hallo' } }],
  reactions: [],
  replies: [],
  _count: { replies: 0 },
};

/**
 * Answers the two lookups the way Postgres would for a single chat with one message: the chat by
 * id, and the message by id, narrowed to chats the caller is a member of when the query asks so.
 */
const prisma = {
  chat: {
    findUnique: jest.fn().mockResolvedValue({
      uuid: CHAT_ID,
      name: 'Kurs-Chat',
      description: undefined,
      type: 'GROUP',
      status: 'OPEN',
      caseNumber: undefined,
      courseId: undefined,
      archivedAt: undefined,
      adminReadAt: undefined,
      capabilities: [],
      messages: [message],
      chatMemberships,
    }),
  },
  message: {
    findFirst: jest.fn(
      ({
        where,
      }: {
        where: { uuid: string; chat?: { chatMemberships: { some: { userId: string } } } };
      }) => {
        if (where.uuid !== MESSAGE_ID) return Promise.resolve();
        const requiredMember = where.chat?.chatMemberships.some.userId;
        if (requiredMember !== undefined) {
          const isMember = chatMemberships.some((m) => m.userId === requiredMember);
          if (!isMember) return Promise.resolve();
        }
        return Promise.resolve(message);
      },
    ),
  },
};

const createCaller = createCallerFactory(createTRPCRouter({ getChat, getMessage }));

const callerAs = (user: unknown): ReturnType<typeof createCaller> =>
  createCaller({ user, prisma, locale: 'de' } as unknown as Context);

describe('chat reads are limited to members', () => {
  it('shows the chat details to a member', async () => {
    const details = await callerAs(member).getChat({ chatId: CHAT_ID });

    expect(details.participants.map((p) => p.id)).toEqual([member.uuid, 'someone-else']);
  });

  it('answers not found to someone who only knows the chat id', async () => {
    await expect(callerAs(outsider).getChat({ chatId: CHAT_ID })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('shows a message to a member', async () => {
    await expect(callerAs(member).getMessage({ messageId: MESSAGE_ID })).resolves.toMatchObject({
      id: MESSAGE_ID,
      messagePayload: { de: 'hallo' },
    });
  });

  it('does not show a message to someone outside its chat', async () => {
    await expect(callerAs(outsider).getMessage({ messageId: MESSAGE_ID })).resolves.toBeUndefined();
  });
});
