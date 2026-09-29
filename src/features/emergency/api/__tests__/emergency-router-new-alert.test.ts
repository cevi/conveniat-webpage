import type { Context } from '@/trpc/init';
import { createCallerFactory } from '@/trpc/init';

// The day-boundary cases below only tell a Zurich day from the server's day when the server runs
// in UTC, as the containers and CI do. Jest hands the suite a copy of `process.env`, so the
// timezone cannot be pinned from in here; run `TZ=UTC jest ...` to see them fail locally.

jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('payload', () => ({ getPayload: jest.fn() }));
jest.mock('@/features/payload-cms/api/cached-globals', () => ({
  getAlertSettingsCached: jest.fn(),
}));
jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
jest.mock('@/config/environment-variables', () => ({ environmentVariables: {} }));
jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));
jest.mock('@prisma/client', () => ({
  ChatMembershipPermission: { MEMBER: 'MEMBER' },
  ChatType: { EMERGENCY: 'EMERGENCY' },
  MessageEventType: { STORED: 'STORED' },
  MessageType: {
    SYSTEM_MSG: 'SYSTEM_MSG',
    LOCATION_MSG: 'LOCATION_MSG',
    ALERT_QUESTION: 'ALERT_QUESTION',
  },
  Prisma: {},
}));

// The push and the realtime events are what the piket notices, so they are what gets observed.
const mockPublish = jest.fn((): Promise<void> => Promise.resolve());
const mockSendNotification = jest.fn((): Promise<void> => Promise.resolve());
const mockGetActivePiketMembers = jest.fn();
jest.mock('@/lib/db/chat-pubsub', () => ({
  chatPubSub: { publish: (...args: unknown[]): unknown => mockPublish(...(args as [])) },
}));
jest.mock('@/lib/push/send-notification', () => ({
  sendNotification: (...args: unknown[]): unknown => mockSendNotification(...(args as [])),
}));
jest.mock('@/features/chat/api/utils/piket-service', () => ({
  getActivePiketMembers: (): unknown => mockGetActivePiketMembers(),
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

import { emergencyRouter } from '@/features/emergency/api/emergency-router';
import { getPayload } from 'payload';

const createCaller = createCallerFactory(emergencyRouter);

const reporter = {
  uuid: 'reporter-1',
  name: 'Anna Muster',
  nickname: 'Fuchs',
  email: 'anna@example.test',
  group_ids: [],
};

interface StoredChat {
  uuid: string;
  name: string;
  caseNumber: string;
  createdAt: Date;
}

/** The parts of a Prisma `where` on chats that a count of the day's cases can reasonably use. */
interface ChatFilter {
  caseNumber?: { startsWith?: string };
  createdAt?: { gte?: Date; lt?: Date };
}

const matches = (chat: StoredChat, where: ChatFilter): boolean =>
  (where.caseNumber?.startsWith === undefined ||
    chat.caseNumber.startsWith(where.caseNumber.startsWith)) &&
  (where.createdAt?.gte === undefined || chat.createdAt >= where.createdAt.gte) &&
  (where.createdAt?.lt === undefined || chat.createdAt < where.createdAt.lt);

/**
 * Stands in for Postgres: a table of emergency chats, a transaction that either commits or fails,
 * and a log of the statements in the order they reached the database.
 */
const createDatabase = (): {
  chats: StoredChat[];
  statements: string[];
  failCommit: boolean;
  failReadBack: boolean;
  prisma: unknown;
} => {
  const database = {
    chats: [] as StoredChat[],
    statements: [] as string[],
    failCommit: false,
    failReadBack: false,
    prisma: undefined as unknown,
  };

  const tx = {
    $executeRaw: jest.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
      database.statements.push(`${strings.join('?')} [${values.join(', ')}]`);
      return Promise.resolve(1);
    }),
    user: { upsert: jest.fn().mockResolvedValue({}) },
    chat: {
      count: jest.fn(({ where }: { where: ChatFilter }) => {
        database.statements.push('count');
        return Promise.resolve(database.chats.filter((chat) => matches(chat, where)).length);
      }),
      create: jest.fn(({ data }: { data: { name: string; caseNumber: string } }) => {
        database.statements.push('insert chat');
        const chat = {
          uuid: `chat-${database.chats.length + 1}`,
          name: data.name,
          caseNumber: data.caseNumber,
          createdAt: new Date(),
        };
        database.chats.push(chat);
        return Promise.resolve(chat);
      }),
    },
    message: {
      findMany: jest.fn(() => {
        if (database.failReadBack) return Promise.reject(new Error('connection reset'));
        return Promise.resolve([
          {
            uuid: 'message-1',
            createdAt: new Date(0),
            senderId: undefined,
            type: 'SYSTEM_MSG',
            contentVersions: [{ payload: {} }],
          },
        ]);
      }),
    },
  };

  database.prisma = {
    $transaction: async <T>(run: (client: typeof tx) => Promise<T>): Promise<T> => {
      const chatsBefore = [...database.chats];
      const result = await run(tx);
      if (database.failCommit) {
        database.chats = chatsBefore;
        throw new Error('could not serialize access');
      }
      return result;
    },
  };

  return database;
};

let database: ReturnType<typeof createDatabase>;

const raiseAlert = async (): Promise<{ chatId: string }> =>
  await createCaller({
    user: reporter,
    locale: 'de',
    prisma: database.prisma,
  } as unknown as Context).newAlert({});

const caseNumbers = (): string[] => database.chats.map((chat) => chat.caseNumber);

describe('emergencyRouter.newAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    jest.setSystemTime(new Date('2026-07-28T10:00:00Z'));

    database = createDatabase();
    (getPayload as jest.Mock).mockResolvedValue({
      findGlobal: jest.fn().mockResolvedValue({ questions: [] }),
    });
    mockGetActivePiketMembers.mockResolvedValue([{ id: 'piket-1', name: 'Erika Beispiel' }]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('the case number', () => {
    it('numbers the alerts of one day consecutively', async () => {
      await raiseAlert();
      await raiseAlert();
      await raiseAlert();

      expect(caseNumbers()).toEqual(['2026-07-28-001', '2026-07-28-002', '2026-07-28-003']);
    });

    it('starts again at 001 on the next day', async () => {
      await raiseAlert();
      jest.setSystemTime(new Date('2026-07-29T10:00:00Z'));
      await raiseAlert();

      expect(caseNumbers()).toEqual(['2026-07-28-001', '2026-07-29-001']);
    });

    it('takes the Swiss date for an alert shortly after midnight in summer', async () => {
      // 00:30 in Zurich, still 22:30 of the day before in UTC
      jest.setSystemTime(new Date('2026-07-27T22:30:00Z'));

      await raiseAlert();

      expect(caseNumbers()).toEqual(['2026-07-28-001']);
    });

    it('takes the Swiss date for an alert shortly after midnight in winter', async () => {
      // 00:30 in Zurich, still 23:30 of the day before in UTC
      jest.setSystemTime(new Date('2026-01-15T23:30:00Z'));

      await raiseAlert();

      expect(caseNumbers()).toEqual(['2026-01-16-001']);
    });

    it('counts the alerts raised in the first hours of a Swiss day towards that day', async () => {
      jest.setSystemTime(new Date('2026-07-27T23:00:00Z')); // 01:00 in Zurich
      await raiseAlert();
      jest.setSystemTime(new Date('2026-07-28T10:00:00Z'));
      await raiseAlert();

      expect(caseNumbers()).toEqual(['2026-07-28-001', '2026-07-28-002']);
    });

    it('locks the day before counting its cases', async () => {
      await raiseAlert();

      const lock = database.statements.findIndex((statement) =>
        statement.includes('pg_advisory_xact_lock'),
      );
      expect(lock).toBeGreaterThanOrEqual(0);
      expect(database.statements[lock]).toContain('emergency-case:2026-07-28');
      expect(lock).toBeLessThan(database.statements.indexOf('count'));
    });
  });

  describe('telling the piket', () => {
    it('pushes the alert and publishes the chat once the transaction has committed', async () => {
      const { chatId } = await raiseAlert();

      expect(mockSendNotification).toHaveBeenCalledWith(
        'Notfall von Anna Muster! (2026-07-28-001)',
        ['piket-1'],
        chatId,
        undefined,
        expect.objectContaining({ notificationType: 'emergency' }),
      );
      expect(mockPublish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'new_message', chatId }),
      );
      expect(mockPublish).toHaveBeenCalledWith(
        'piket-1',
        expect.objectContaining({ type: 'new_chat', chatId }),
      );
    });

    it('stays silent when the commit fails', async () => {
      database.failCommit = true;

      await expect(raiseAlert()).rejects.toThrow();

      expect(database.chats).toEqual([]);
      expect(mockSendNotification).not.toHaveBeenCalled();
      expect(mockPublish).not.toHaveBeenCalled();
    });

    it('stays silent when a statement after the insert fails', async () => {
      database.failReadBack = true;

      await expect(raiseAlert()).rejects.toThrow();

      expect(database.statements).toContain('insert chat');
      expect(mockSendNotification).not.toHaveBeenCalled();
      expect(mockPublish).not.toHaveBeenCalled();
    });
  });
});
