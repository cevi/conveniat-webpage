import type { Context } from '@/trpc/init';
import { createCallerFactory, createTRPCRouter } from '@/trpc/init';

jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('payload', () => ({ getPayload: jest.fn() }));
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

import { markChatAsRead } from '@/features/chat/api/mutations/mark-chat-as-read';
import { LARGE_CHAT_THRESHOLD } from '@/lib/chat-shared';

const CHAT_ID = '0192f3a4-0000-7000-8000-000000000001';
const MESSAGE_ID = '0192f3a4-0000-7000-8000-000000000002';
const OLDER_MESSAGE_ID = '0192f3a4-0000-7000-8000-000000000003';
const READER = 'reader';

/** The position of each message in the chat, see `Message.seq`. */
const positions = new Map([
  [OLDER_MESSAGE_ID, 4],
  [MESSAGE_ID, 7],
]);

interface ReadEvent {
  messageId: string;
  userId: string;
  type: string;
}

interface MarkerWhere {
  userId: string;
  chatId: string;
  OR: [{ lastReadSeq: null }, { lastReadSeq: { lt: number } }];
}

let memberIds: string[];
let readEvents: ReadEvent[];
let lastReadSeq: number | null;
/** How many membership rows the procedure made the database look at. */
let membershipRowsRead: number;

/** The chat tables, with just enough of Prisma's behaviour for this procedure. */
const prisma = {
  message: {
    findFirst: ({ where }: { where: { uuid: string } }): Promise<{ seq: number } | null> => {
      const seq = positions.get(where.uuid);
      // eslint-disable-next-line unicorn/no-null
      return Promise.resolve(seq === undefined ? null : { seq });
    },
  },
  chatMembership: {
    findUnique: (): Promise<{ userId: string }> => Promise.resolve({ userId: READER }),
    updateMany: ({
      where,
      data,
    }: {
      where: MarkerWhere;
      data: { lastReadSeq: number };
    }): Promise<{ count: number }> => {
      const below = where.OR[1].lastReadSeq.lt;
      if (where.userId !== READER || (lastReadSeq !== null && lastReadSeq >= below)) {
        return Promise.resolve({ count: 0 });
      }
      lastReadSeq = data.lastReadSeq;
      return Promise.resolve({ count: 1 });
    },
    count: ({ take }: { where: { chatId: string }; take?: number }): Promise<number> => {
      const counted = Math.min(memberIds.length, take ?? memberIds.length);
      membershipRowsRead += counted;
      return Promise.resolve(counted);
    },
  },
  messageEvent: {
    createMany: ({ data }: { data: ReadEvent[] }): Promise<{ count: number }> => {
      readEvents.push(...data);
      return Promise.resolve({ count: data.length });
    },
  },
};

const createCaller = createCallerFactory(createTRPCRouter({ markChatAsRead }));
const caller = createCaller({
  user: { uuid: READER, group_ids: [], name: 'Anna Muster', email: 'anna@example.test' },
  prisma,
  locale: 'de',
} as unknown as Context);

const chatWithMembers = (count: number): string[] =>
  Array.from({ length: count }, (_, index) => (index === 0 ? READER : `member-${index}`));

beforeEach(() => {
  memberIds = chatWithMembers(3);
  // eslint-disable-next-line unicorn/no-null
  lastReadSeq = null;
  readEvents = [];
  membershipRowsRead = 0;
});

describe('marking a chat as read', () => {
  it('moves the read marker to the position of the message', async () => {
    await caller.markChatAsRead({ chatId: CHAT_ID, lastMessageId: MESSAGE_ID });

    expect(lastReadSeq).toBe(7);
  });

  it('keeps the marker where it is when an older message is marked read late', async () => {
    await caller.markChatAsRead({ chatId: CHAT_ID, lastMessageId: MESSAGE_ID });
    await caller.markChatAsRead({ chatId: CHAT_ID, lastMessageId: OLDER_MESSAGE_ID });

    expect(lastReadSeq).toBe(7);
  });

  it('records a READ event for the read ticks of a small chat', async () => {
    memberIds = chatWithMembers(LARGE_CHAT_THRESHOLD - 1);

    await caller.markChatAsRead({ chatId: CHAT_ID, lastMessageId: MESSAGE_ID });

    expect(readEvents).toEqual([{ messageId: MESSAGE_ID, userId: READER, type: 'READ' }]);
  });

  it('records no READ event in a large chat', async () => {
    memberIds = chatWithMembers(LARGE_CHAT_THRESHOLD);

    await caller.markChatAsRead({ chatId: CHAT_ID, lastMessageId: MESSAGE_ID });

    expect(readEvents).toEqual([]);
  });

  it('looks at no more memberships in an announcement channel than in a chat at the threshold', async () => {
    memberIds = chatWithMembers(3000);

    await caller.markChatAsRead({ chatId: CHAT_ID, lastMessageId: MESSAGE_ID });

    expect(membershipRowsRead).toBeLessThanOrEqual(LARGE_CHAT_THRESHOLD);
  });
});
