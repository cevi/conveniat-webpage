jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('payload', () => ({ getPayload: jest.fn() }));
jest.mock('@/lib/db/chat-pubsub', () => ({
  chatPubSub: { publish: (): Promise<void> => Promise.resolve() },
}));
jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  get default(): unknown {
    return mockPrisma;
  },
}));

import { syncPiketMembersToOpenChats } from '@/features/chat/api/utils/piket-service';
import type { Payload } from 'payload';

interface Chat {
  uuid: string;
  status: string;
  type: string;
  archivedAt: Date | null;
  chatMemberships: { userId: string }[];
}

let chats: Chat[];
let messagesInChat: string[];

/** Answers a `where` of plain equalities, `null` and `{ in: [...] }`, as Prisma would. */
const matches = (chat: Chat, where: Record<string, unknown>): boolean =>
  Object.entries(where).every(([key, condition]) => {
    const value = chat[key as keyof Chat];
    if (condition !== null && typeof condition === 'object' && 'in' in condition) {
      return (condition.in as unknown[]).includes(value);
    }
    return value === condition;
  });

const mockPrisma = {
  chat: {
    findMany: ({ where }: { where: Record<string, unknown> }): Promise<Chat[]> =>
      Promise.resolve(chats.filter((chat) => matches(chat, where))),
    update: (): Promise<void> => Promise.resolve(),
  },
  user: { upsert: (): Promise<void> => Promise.resolve() },
  chatMembership: {
    upsert: ({ create }: { create: { chatId: string; userId: string } }): Promise<void> => {
      chats.find((chat) => chat.uuid === create.chatId)?.chatMemberships.push(create);
      return Promise.resolve();
    },
  },
  message: {
    create: ({ data }: { data: { chatId: string } }): Promise<unknown> => {
      messagesInChat.push(data.chatId);
      return Promise.resolve({ uuid: `message-${messagesInChat.length}`, createdAt: new Date() });
    },
  },
};

const payload = {
  find: (): Promise<unknown> =>
    Promise.resolve({
      docs: [
        {
          id: 'shift-1',
          startTime: new Date(Date.now() - 3_600_000).toISOString(),
          endTime: new Date(Date.now() + 3_600_000).toISOString(),
          chatTypes: ['SUPPORT_GROUP'],
          users: [{ id: 'piket-1', fullName: 'Lea Muster' }],
        },
      ],
    }),
} as unknown as Payload;

const supportChat = (uuid: string, archivedAt: Date | null): Chat => ({
  uuid,
  status: 'OPEN',
  type: 'SUPPORT_GROUP',
  archivedAt,
  chatMemberships: [{ userId: 'reporter' }],
});

beforeEach(() => {
  messagesInChat = [];
  chats = [
    // eslint-disable-next-line unicorn/no-null
    supportChat('open-chat', null),
    supportChat('archived-chat', new Date(Date.now() - 60_000)),
  ];
});

describe('syncPiketMembersToOpenChats', () => {
  it('adds the piket member to an open support chat', async () => {
    await syncPiketMembersToOpenChats(payload);

    const openChat = chats.find((chat) => chat.uuid === 'open-chat');
    expect(openChat?.chatMemberships.map((m) => m.userId)).toContain('piket-1');
    expect(messagesInChat).toEqual(['open-chat']);
  });

  it('leaves an archived support chat untouched', async () => {
    await syncPiketMembersToOpenChats(payload);

    const archivedChat = chats.find((chat) => chat.uuid === 'archived-chat');
    expect(archivedChat?.chatMemberships).toEqual([{ userId: 'reporter' }]);
    expect(messagesInChat).not.toContain('archived-chat');
  });
});
