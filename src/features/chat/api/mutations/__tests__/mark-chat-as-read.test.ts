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
const READER = 'reader';

interface ReadEvent {
  messageId: string;
  userId: string;
  type: string;
}

let memberIds: string[];
/** The reader's own unread mark, see `markChatUnread`. */
let markedUnread: boolean;
/** Whether the read message is newer than the stored high-water mark, so the mark moves. */
let readsNewerMessage: boolean;
let readEvents: ReadEvent[];
/** How many membership rows the procedure made the database look at. */
let membershipRowsRead: number;

/** The chat tables, with just enough of Prisma's behaviour for this procedure. */
const prisma = {
  message: {
    findFirst: ({ where }: { where: { uuid: string } }): Promise<{ uuid: string } | null> =>
      // eslint-disable-next-line unicorn/no-null
      Promise.resolve(where.uuid === MESSAGE_ID ? { uuid: MESSAGE_ID } : null),
  },
  // Advancing the high-water mark has its own SQL; this stands in for what that statement
  // writes besides the mark.
  $executeRaw: (sql: TemplateStringsArray): Promise<number> => {
    if (!readsNewerMessage) return Promise.resolve(0);
    if (sql.join('?').includes('"markedUnread" = false')) markedUnread = false;
    return Promise.resolve(1);
  },
  chatMembership: {
    findUnique: (): Promise<{ userId: string; markedUnread: boolean }> =>
      Promise.resolve({ userId: READER, markedUnread }),
    update: ({ data }: { data: { markedUnread?: boolean } }): Promise<unknown> => {
      if (data.markedUnread !== undefined) markedUnread = data.markedUnread;
      return Promise.resolve({});
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
  readEvents = [];
  membershipRowsRead = 0;
  markedUnread = false;
  readsNewerMessage = true;
  memberIds = chatWithMembers(2);
});

describe('marking a chat as read', () => {
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

describe('reading a chat the reader marked unread', () => {
  it('takes the mark away when the read moves the high-water mark', async () => {
    markedUnread = true;

    await caller.markChatAsRead({ chatId: CHAT_ID, lastMessageId: MESSAGE_ID });

    expect(markedUnread).toBe(false);
  });

  // A message older than the stored high-water mark, read late on a slow connection.
  it('takes the mark away when the high-water mark stays', async () => {
    markedUnread = true;
    readsNewerMessage = false;

    await caller.markChatAsRead({ chatId: CHAT_ID, lastMessageId: MESSAGE_ID });

    expect(markedUnread).toBe(false);
  });
});
