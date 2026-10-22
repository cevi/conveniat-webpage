import type { Context } from '@/trpc/init';
import { createCallerFactory, createTRPCRouter } from '@/trpc/init';

jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('payload', () => ({ getPayload: jest.fn() }));
jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));
jest.mock('@/config/environment-variables', () => ({ environmentVariables: {} }));
// the queries take the enum from the generated client; the values are all they need
jest.mock('@prisma/client', () => ({ MessageEventType: { READ: 'READ', STORED: 'STORED' } }));
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

import { getChatMessages } from '@/features/chat/api/queries/get-chat-messages';
import { getMessage } from '@/features/chat/api/queries/get-message';
import { getUnreadMarker } from '@/features/chat/api/queries/get-unread-marker';

const CHAT_ID = '0190a5b2-0000-7000-8000-000000000001';
const ANNA = 'anna';
const BEN = 'ben';
const CLARA = 'clara';
const DAVID = 'david';
const EMMA = 'emma';

type Row = Record<string, unknown>;

interface StoredMessage extends Row {
  uuid: string;
  chatId: string;
  senderId: string | null;
  type: string;
  parentId: string | null;
  createdAt: Date;
  deletedAt: Date | null;
  payload: unknown;
}

let messages: StoredMessage[];
let reactions: { messageId: string; userId: string; emoji: string }[];
let lastReadMessageId: string | null;

/* eslint-disable unicorn/no-null -- mirrors the Prisma rows and filters */

/**
 * Evaluates the part of a Prisma `where` these queries use: equality, `null`, `not`, `gt`,
 * `in`, `AND`, `OR`, and an empty object matching everything.
 */
const matches = (row: Row, where: Row): boolean =>
  Object.entries(where).every(([key, condition]) => {
    if (key === 'AND') return (condition as Row[]).every((part) => matches(row, part));
    if (key === 'OR') return (condition as Row[]).some((part) => matches(row, part));
    const value = row[key];
    if (condition === null) return value === null;
    if (condition instanceof Date)
      return value instanceof Date && value.getTime() === condition.getTime();
    if (typeof condition !== 'object') return value === condition;
    const operators = condition as Row;
    if ('not' in operators) {
      return operators['not'] === null ? value !== null : value !== operators['not'];
    }
    if ('gt' in operators) {
      const bound = operators['gt'];
      if (bound instanceof Date) return value instanceof Date && value > bound;
      return typeof value === 'string' && value > String(bound);
    }
    if ('in' in operators) return (operators['in'] as unknown[]).includes(value);
    return true;
  });

const byTime = (a: StoredMessage, b: StoredMessage): number =>
  a.createdAt.getTime() - b.createdAt.getTime() || a.uuid.localeCompare(b.uuid);

const users: Record<string, { uuid: string; name: string; profilePictureVersion: string | null }> =
  Object.fromEntries(
    [ANNA, BEN, CLARA, DAVID, EMMA].map((uuid) => [
      uuid,
      {
        uuid,
        name: `${uuid[0]?.toUpperCase() ?? ''}${uuid.slice(1)} Muster`,
        profilePictureVersion: null,
      },
    ]),
  );

/** A message row as the read queries include it. */
const withIncludes = (message: StoredMessage, readerId: string): Row => ({
  ...message,
  messageEvents: [],
  contentVersions: [{ payload: message.payload }],
  sender: message.senderId === null ? null : { name: users[message.senderId]?.name },
  _count: { replies: messages.filter((m) => m.parentId === message.uuid).length },
  reactions: reactions
    .filter((reaction) => reaction.messageId === message.uuid)
    .map((reaction) => ({ ...reaction, user: { name: users[reaction.userId]?.name } })),
  replies: messages.filter((m) => m.parentId === message.uuid && m.senderId !== readerId),
});

let reader = ANNA;

const prisma = {
  chat: {
    findUnique: (): Promise<Row> =>
      Promise.resolve({ uuid: CHAT_ID, adminReadAt: null, chatMemberships: [{ userId: reader }] }),
  },
  chatMembership: {
    findUnique: (): Promise<Row> => Promise.resolve({ lastReadMessageId }),
  },
  user: {
    findMany: ({ where }: { where: { uuid: { in: string[] } } }): Promise<Row[]> =>
      Promise.resolve(where.uuid.in.flatMap((uuid) => (users[uuid] ? [users[uuid]] : []))),
  },
  message: {
    findFirst: ({
      where,
      orderBy,
      include,
    }: {
      where: Row;
      orderBy?: unknown;
      include?: unknown;
    }): Promise<Row | null> => {
      // the membership condition of `getMessage`; every caller here is a member
      const plain = Object.fromEntries(Object.entries(where).filter(([key]) => key !== 'chat'));
      const found = messages.filter((message) => matches(message, plain)).toSorted(byTime);
      void orderBy; // every caller here asks for the oldest first, or for one by id
      const first = found[0];
      if (first === undefined) return Promise.resolve(null);
      return Promise.resolve(include === undefined ? first : withIncludes(first, reader));
    },
    findMany: ({ where, take }: { where: Row; take?: number }): Promise<Row[]> => {
      const found = messages
        .filter((message) => matches(message, where))
        .toSorted(byTime)
        .toReversed()
        .slice(0, take ?? Infinity);
      return Promise.resolve(found.map((message) => withIncludes(message, reader)));
    },
    count: ({ where }: { where: Row }): Promise<number> =>
      Promise.resolve(messages.filter((message) => matches(message, where)).length),
    groupBy: ({ where }: { where: Row }): Promise<Row[]> => {
      const groups = new Map<string, Row>();
      for (const message of messages.filter((m) => matches(m, where))) {
        const key = `${message.parentId ?? ''}|${message.senderId ?? ''}`;
        const group = groups.get(key);
        const latest = group?.['_max'] as { createdAt: Date } | undefined;
        if (latest === undefined || message.createdAt > latest.createdAt) {
          groups.set(key, {
            parentId: message.parentId,
            senderId: message.senderId,
            _max: { createdAt: message.createdAt },
          });
        }
      }
      return Promise.resolve([...groups.values()]);
    },
  },
};

let minute = 0;
const seed = (
  senderId: string | null,
  payload: unknown,
  extra: Partial<StoredMessage> = {},
): string => {
  minute++;
  const uuid = `00000000-0000-4000-8000-${String(minute).padStart(12, '0')}`;
  messages.push({
    uuid,
    chatId: CHAT_ID,
    senderId,
    type: senderId === null ? 'SYSTEM_MSG' : 'TEXT_MSG',
    parentId: null,
    createdAt: new Date(Date.UTC(2027, 6, 25, 8, minute)),
    deletedAt: null,
    payload,
    ...extra,
  });
  return uuid;
};
/* eslint-enable unicorn/no-null */

const createCaller = createCallerFactory(
  createTRPCRouter({ getChatMessages, getMessage, getUnreadMarker }),
);
const as = (uuid: string): ReturnType<typeof createCaller> => {
  reader = uuid;
  return createCaller({
    user: { uuid, group_ids: [], name: users[uuid]?.name, email: `${uuid}@example.test` },
    prisma,
    locale: 'de',
  } as unknown as Context);
};

beforeEach(() => {
  messages = [];
  reactions = [];
  // eslint-disable-next-line unicorn/no-null
  lastReadMessageId = null;
  minute = 0;
});

describe('getUnreadMarker', () => {
  it('points at the first message after the one the reader read last', async () => {
    const read = seed(BEN, { text: 'Morgen um 8 beim Hof Cevi Uster' });
    lastReadMessageId = read;
    const firstNew = seed(BEN, { text: 'Bringt Regenjacken mit' });
    seed(CLARA, { text: 'Ok' });

    await expect(as(ANNA).getUnreadMarker({ chatId: CHAT_ID })).resolves.toEqual({
      firstUnreadMessageId: firstNew,
      unreadCount: 2,
    });
  });

  it('never counts the reader’s own messages', async () => {
    lastReadMessageId = seed(BEN, { text: 'Wer kommt?' });
    seed(ANNA, { text: 'Ich' });
    const firstOther = seed(CLARA, { text: 'Ich auch' });

    await expect(as(ANNA).getUnreadMarker({ chatId: CHAT_ID })).resolves.toEqual({
      firstUnreadMessageId: firstOther,
      unreadCount: 1,
    });
  });

  it('has no line when nothing is unread', async () => {
    seed(BEN, { text: 'Hoi' });
    lastReadMessageId = seed(CLARA, { text: 'Hoi zäme' });
    seed(ANNA, { text: 'Salü' });

    await expect(as(ANNA).getUnreadMarker({ chatId: CHAT_ID })).resolves.toEqual({
      firstUnreadMessageId: undefined,
      unreadCount: 0,
    });
  });

  it('skips replies in threads and deleted messages', async () => {
    const root = seed(BEN, { text: 'Wer hilft beim Aufbau?' });
    lastReadMessageId = root;
    seed(CLARA, { text: 'Ich' }, { parentId: root });
    seed(DAVID, { text: 'Verschrieben' }, { deletedAt: new Date() });
    const firstUnread = seed(EMMA, { text: 'Ich komme am Mittwoch' });

    await expect(as(ANNA).getUnreadMarker({ chatId: CHAT_ID })).resolves.toEqual({
      firstUnreadMessageId: firstUnread,
      unreadCount: 1,
    });
  });
});

describe('reading a deleted message', () => {
  it('keeps its place and sender, without its content or reactions', async () => {
    const deleted = seed(BEN, { text: 'Das Passwort ist 1234' }, { deletedAt: new Date() });
    reactions.push({ messageId: deleted, userId: ANNA, emoji: '😮' });

    const { items } = await as(ANNA).getChatMessages({ chatId: CHAT_ID });

    expect(items).toEqual([
      expect.objectContaining({
        id: deleted,
        senderId: BEN,
        senderName: 'Ben Muster',
        messagePayload: {},
        reactions: [],
        deletedAt: expect.any(Date) as unknown,
      }),
    ]);
  });

  it('drops the snippet from the quotes of it', async () => {
    const deleted = seed(BEN, { text: 'Das Passwort ist 1234' }, { deletedAt: new Date() });
    const quote = seed(CLARA, {
      text: 'Lösch das lieber',
      quotedMessageId: deleted,
      quotedSnippet: 'Das Passwort ist 1234',
    });

    const message = await as(ANNA).getMessage({ messageId: quote });

    expect(message).toMatchObject({ quotedMessageDeleted: true });
    expect(message?.messagePayload).toEqual({ text: 'Lösch das lieber', quotedMessageId: deleted });
  });

  it('names the sender of a single message, as the list does', async () => {
    const messageId = seed(BEN, { text: 'Treffpunkt beim Hof Züri 11' });

    await expect(as(ANNA).getMessage({ messageId })).resolves.toMatchObject({
      senderName: 'Ben Muster',
    });
  });
});

describe('thread summaries', () => {
  it('names the people who replied, the latest first, with the time of the last reply', async () => {
    const root = seed(ANNA, { text: 'Wer bringt einen Gaskocher?' });
    seed(BEN, { text: 'Ich' }, { parentId: root });
    seed(CLARA, { text: 'Ich habe zwei' }, { parentId: root });
    seed(BEN, { text: 'Dann lass ich meinen daheim' }, { parentId: root });
    seed(DAVID, { text: 'Ich auch' }, { parentId: root });
    const last = seed(EMMA, { text: 'Super' }, { parentId: root });

    const { items } = await as(ANNA).getChatMessages({ chatId: CHAT_ID });

    expect(items[0]?.threadSummary).toEqual({
      lastReplyAt: messages.find((m) => m.uuid === last)?.createdAt,
      replierCount: 4,
      repliers: [
        { id: EMMA, name: 'Emma Muster' },
        { id: DAVID, name: 'David Muster' },
        { id: BEN, name: 'Ben Muster' },
      ],
    });
  });

  it('leaves it out on a message without replies', async () => {
    seed(ANNA, { text: 'Hoi zäme' });

    const { items } = await as(ANNA).getChatMessages({ chatId: CHAT_ID });

    expect(items[0]?.threadSummary).toBeUndefined();
  });
});
