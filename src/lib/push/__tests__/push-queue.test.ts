jest.mock('@payload-config', () => ({}), { virtual: true });

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    NEXT_PUBLIC_APP_HOST_URL: 'https://example.test',
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'public',
    VAPID_PRIVATE_KEY: 'private',
  },
}));

const mockFind = jest.fn();
const mockPayloadDelete = jest.fn().mockResolvedValue({ docs: [] });
jest.mock('payload', () => ({
  getPayload: (): { find: jest.Mock; delete: jest.Mock } => ({
    find: mockFind,
    delete: mockPayloadDelete,
  }),
}));

const mockSendPushToDevice = jest.fn();
jest.mock('@/lib/push/push-transport', () => ({
  ...jest.requireActual<object>('@/lib/push/push-transport'),
  sendPushToDevice: (...args: unknown[]): unknown => mockSendPushToDevice(...args),
}));

jest.mock('@/lib/push-metrics', () => ({
  recordPushSend: jest.fn(),
  recordPushRecipients: jest.fn(),
  recordPushDeliveriesEnqueued: jest.fn(),
  recordPushDeliveriesDropped: jest.fn(),
  recordPushNotificationCompleted: jest.fn(),
  registerPushQueueGauges: jest.fn(),
}));

// The factory has to build the logger itself: `jest.mock` is hoisted above any const
// it would close over, and the module under test calls `createLogger` on load.
jest.mock('@/utils/server-logger', () => {
  const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  return { createLogger: (): typeof logger => logger, __logger: logger };
});

/** Rows each claim hands out, in order; a claim past the end finds nothing due. */
const claimBatches: unknown[][] = [];
const mockNotificationCreate = jest.fn().mockResolvedValue({ id: 'notification-1' });
const mockLogCreateMany = jest.fn().mockResolvedValue({ count: 0 });
const mockNotificationFindMany = jest.fn();
const mockNotificationUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
const mockLogUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
const mockPendingGroups = jest.fn().mockResolvedValue([]);
jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: {
    $queryRaw: (strings: TemplateStringsArray): Promise<unknown[]> =>
      Promise.resolve(
        strings.join('').includes('FOR UPDATE SKIP LOCKED') ? (claimBatches.shift() ?? []) : [],
      ),
    $transaction: (work: (transaction: unknown) => Promise<unknown>): Promise<unknown> =>
      work({
        pushNotification: { create: mockNotificationCreate },
        pushNotificationLog: { createMany: mockLogCreateMany },
      }),
    pushNotification: {
      findMany: (...args: unknown[]): unknown => mockNotificationFindMany(...args),
      updateMany: (...args: unknown[]): unknown => mockNotificationUpdateMany(...args),
      findUniqueOrThrow: (): unknown =>
        Promise.resolve({
          kind: 'EMERGENCY',
          createdAt: new Date(Date.now() - 4000),
          chatId: 'chat-1',
          messageId: undefined,
        }),
    },
    pushNotificationLog: {
      updateMany: (...args: unknown[]): unknown => mockLogUpdateMany(...args),
      groupBy: (query: { by: string[] }): unknown =>
        query.by[0] === 'notificationId' ? mockPendingGroups() : Promise.resolve([]),
    },
  },
}));

import { recordPushDeliveriesDropped, recordPushRecipients } from '@/lib/push-metrics';
import { drainPushQueue, enqueuePushNotification } from '@/lib/push/push-queue';

interface MockLogger {
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
}
const { __logger: mockLogger } = jest.requireMock<{ __logger: MockLogger }>(
  '@/utils/server-logger',
);

const hour = 60 * 60 * 1000;

/* eslint-disable unicorn/no-null -- mirrors the Prisma row */
const notification = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'notification-1',
  kind: 'ANNOUNCEMENT',
  title: 'conveniat27',
  body: 'Das Gesamtlager startet morgen',
  url: 'https://example.test/app/chat/chat-1',
  chatId: 'chat-1',
  messageId: 'message-1',
  notificationType: null,
  ignoreIfUrlMatches: true,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + hour),
  completedAt: null,
  ...overrides,
});
/* eslint-enable unicorn/no-null */

const claimed = (id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id,
  userId: `user-${id}`,
  subscriptionId: `sub-${id}`,
  notificationId: 'notification-1',
  attempts: 1,
  channel: 'WEB_PUSH',
  ...overrides,
});

const webSubscription = (id: string): Record<string, unknown> => ({
  id,
  platform: 'web',
  endpoint: `https://push.example.test/${id}`,
  keys: { p256dh: 'p256dh', auth: 'auth' },
});

/** The subscriptions a batch finds in Mongo: one per claimed row unless told otherwise. */
const givenSubscriptions = (ids: string[]): void => {
  mockFind.mockResolvedValue({ docs: ids.map((id) => webSubscription(id)) });
};

const writesOf = (): { where: { id: { in: string[] } }; data: Record<string, unknown> }[] =>
  (mockLogUpdateMany.mock.calls as unknown[][]).map(
    (call) => call[0] as { where: { id: { in: string[] } }; data: Record<string, unknown> },
  );

beforeEach(() => {
  jest.clearAllMocks();
  claimBatches.length = 0;
  mockNotificationFindMany.mockResolvedValue([notification()]);
  mockSendPushToDevice.mockResolvedValue({ outcome: 'accepted' });
});

describe('enqueuePushNotification', () => {
  const push = {
    kind: 'EMERGENCY' as const,
    recipientUserIds: ['anna', 'ben', 'cleo'],
    title: 'Piket',
    body: '*Notfall* beim Hof Züri 11',
    chatId: 'chat-1',
  };

  beforeEach(() => {
    mockFind.mockResolvedValue({
      docs: [
        { id: 'sub-anna-phone', user: 'anna', platform: 'ios' },
        { id: 'sub-anna-laptop', user: 'anna', platform: 'web' },
        { id: 'sub-ben', user: 'ben', platform: 'web' },
      ],
    });
  });

  it('stores one delivery per device, with the priority and lifetime of its kind', async () => {
    const before = Date.now();

    const result = await enqueuePushNotification(push);
    await drainPushQueue('urgent');

    expect(result).toEqual({ notificationId: 'notification-1', deliveries: 3 });
    const rows = (
      (mockLogCreateMany.mock.calls as unknown[][])[0]?.[0] as { data: Record<string, unknown>[] }
    ).data;
    expect(rows.map((row) => [row['subscriptionId'], row['channel'], row['priority']])).toEqual([
      ['sub-anna-phone', 'NATIVE_FCM', 3],
      ['sub-anna-laptop', 'WEB_PUSH', 3],
      ['sub-ben', 'WEB_PUSH', 3],
    ]);
    const { data } = (mockNotificationCreate.mock.calls as unknown[][])[0]?.[0] as {
      data: { body: string; expiresAt: Date };
    };
    // Stored the way the device shows it, so a retry sends exactly what the first try did.
    expect(data.body).toBe('Notfall beim Hof Züri 11');
    expect(data.expiresAt.getTime() - before).toBeGreaterThanOrEqual(hour);
    expect(recordPushRecipients).toHaveBeenCalledWith('EMERGENCY', 2, 1);
  });

  /**
   * Payload applies an explicit `limit` even when `pagination` is false, so a limit here
   * silently drops every recipient past it — no error, no log.
   */
  it('does not cap the recipient lookup', async () => {
    await enqueuePushNotification(push);
    await drainPushQueue('urgent');

    const query = (mockFind.mock.calls as unknown[][])[0]?.[0] as {
      pagination?: boolean;
      limit?: number;
    };
    expect(query.pagination).toBe(false);
    expect(query.limit).toBeUndefined();
  });

  it('stores nothing when none of the recipients has a device', async () => {
    mockFind.mockResolvedValue({ docs: [] });

    const result = await enqueuePushNotification(push);

    expect(result).toEqual({ deliveries: 0 });
    expect(mockNotificationCreate).not.toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith('Push reached no device', expect.anything());
  });
});

describe('drainPushQueue', () => {
  it('marks a delivery the push service accepted as sent', async () => {
    claimBatches.push([claimed('a')]);
    givenSubscriptions(['sub-a']);

    const summary = await drainPushQueue('all');

    expect(summary).toMatchObject({ batches: 1, accepted: 1 });
    expect(mockSendPushToDevice).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sub-a' }),
      expect.objectContaining({ body: 'Das Gesamtlager startet morgen', messageId: 'message-1' }),
      expect.objectContaining({ logId: 'a', urgent: false }),
    );
    // A device can report DELIVERED before the batch is written back; that must survive.
    expect(writesOf()[0]).toMatchObject({
      where: { id: { in: ['a'] }, status: 'PENDING' },
      // eslint-disable-next-line unicorn/no-null -- Prisma clears a column only through null
      data: { status: 'SENT', error: null, leaseUntil: null },
    });
  });

  it('puts a delivery the push service could not take back on the queue for later', async () => {
    claimBatches.push([claimed('a')]);
    givenSubscriptions(['sub-a']);
    mockSendPushToDevice.mockResolvedValueOnce({
      outcome: 'retry',
      error: 'Push service answered 503',
    });

    const summary = await drainPushQueue('all');

    expect(summary.retried).toBe(1);
    const [write] = writesOf();
    expect(write?.data).toMatchObject({ status: 'PENDING', error: 'Push service answered 503' });
    expect((write?.data['nextAttemptAt'] as Date).getTime()).toBeGreaterThan(Date.now());
  });

  it('gives up on a delivery that failed on its last attempt', async () => {
    claimBatches.push([claimed('a', { attempts: 5 })]);
    givenSubscriptions(['sub-a']);
    mockSendPushToDevice.mockResolvedValueOnce({ outcome: 'retry', error: 'Socket timeout' });

    await drainPushQueue('all');

    expect(writesOf()[0]?.data).toMatchObject({
      status: 'FAILED',
      error: 'Gave up after 5 attempts: Socket timeout',
    });
    expect(recordPushDeliveriesDropped).toHaveBeenCalledWith(
      'ANNOUNCEMENT',
      'attempts_exhausted',
      1,
    );
    expect(mockLogger.warn).toHaveBeenCalledWith('Push deliveries given up', expect.anything());
  });

  it('deletes the subscription of a device that unsubscribed', async () => {
    claimBatches.push([claimed('a')]);
    givenSubscriptions(['sub-a']);
    mockSendPushToDevice.mockResolvedValueOnce({
      outcome: 'expired',
      error: 'Push service answered 410',
    });

    await drainPushQueue('all');

    expect(writesOf()[0]?.data).toMatchObject({ status: 'FAILED' });
    expect(mockPayloadDelete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['sub-a'] } } }),
    );
  });

  // The queue was down longer than the push stays useful: sending it now only wakes
  // somebody for something that is over.
  it('does not send a push that expired while it waited', async () => {
    claimBatches.push([claimed('a')]);
    givenSubscriptions(['sub-a']);
    mockNotificationFindMany.mockResolvedValue([
      notification({ expiresAt: new Date(Date.now() - 1000) }),
    ]);

    await drainPushQueue('all');

    expect(mockSendPushToDevice).not.toHaveBeenCalled();
    expect(writesOf()[0]?.data).toMatchObject({
      status: 'FAILED',
      error: 'Expired before it could be sent',
    });
  });

  it('does not send to a device that unsubscribed while the delivery waited', async () => {
    claimBatches.push([claimed('a')]);
    givenSubscriptions([]);

    await drainPushQueue('all');

    expect(mockSendPushToDevice).not.toHaveBeenCalled();
    expect(recordPushDeliveriesDropped).toHaveBeenCalledWith(
      'ANNOUNCEMENT',
      'subscription_gone',
      1,
    );
  });

  it('logs an error for a delivery the push service refused for good', async () => {
    claimBatches.push([claimed('a'), claimed('b')]);
    givenSubscriptions(['sub-a', 'sub-b']);
    mockSendPushToDevice.mockResolvedValueOnce({
      outcome: 'failed',
      error: 'Push service answered 403: invalid JWT provided',
    });

    await drainPushQueue('all');

    // One line for the batch, not one per device.
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Push deliveries failed',
      expect.objectContaining({
        'push.failed': 1,
        'push.accepted': 1,
        'push.errors': ['Push service answered 403: invalid JWT provided'],
      }),
    );
  });

  it('works through every due batch', async () => {
    claimBatches.push([claimed('a')], [claimed('b')]);
    givenSubscriptions(['sub-a', 'sub-b']);

    await expect(drainPushQueue('all')).resolves.toMatchObject({ batches: 2, accepted: 2 });
  });

  /**
   * Both replicas can settle the last rows of one push at the same moment. Only the one
   * whose update stamped `completedAt` reports it, so Loki shows each push once.
   */
  it('reports a push as complete only from the worker that settled it', async () => {
    mockNotificationFindMany.mockResolvedValue([notification({ kind: 'EMERGENCY' })]);
    claimBatches.push([claimed('a')]);
    givenSubscriptions(['sub-a']);

    await drainPushQueue('urgent');
    expect(mockLogger.info).toHaveBeenCalledWith('Push completed', expect.anything());

    jest.clearAllMocks();
    mockNotificationUpdateMany.mockResolvedValueOnce({ count: 0 });
    claimBatches.push([claimed('b')]);
    givenSubscriptions(['sub-b']);
    await drainPushQueue('urgent');
    expect(mockLogger.info).not.toHaveBeenCalledWith('Push completed', expect.anything());
  });

  it('does not report a push as complete while deliveries are still waiting', async () => {
    mockPendingGroups.mockResolvedValueOnce([{ notificationId: 'notification-1' }]);
    claimBatches.push([claimed('a')]);
    givenSubscriptions(['sub-a']);

    await drainPushQueue('all');

    expect(mockNotificationUpdateMany).not.toHaveBeenCalled();
  });

  it('never has more than 25 sends in flight', async () => {
    const ids = Array.from({ length: 100 }, (_, index) => `row-${String(index)}`);
    claimBatches.push(ids.map((id) => claimed(id)));
    givenSubscriptions(ids.map((id) => `sub-${id}`));
    let inFlight = 0;
    let peak = 0;
    mockSendPushToDevice.mockImplementation(async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 1));
      inFlight--;
      return { outcome: 'accepted' };
    });

    await drainPushQueue('all');

    expect(mockSendPushToDevice).toHaveBeenCalledTimes(100);
    expect(peak).toBe(25);
  });

  // A burst of chat messages kicks the queue once per message. Starting a loop each time
  // would multiply the sends in flight by the size of the burst.
  it('joins a drain already running instead of starting a second one', async () => {
    claimBatches.push([claimed('a')]);
    givenSubscriptions(['sub-a']);

    const first = drainPushQueue('all');
    const second = drainPushQueue('all');

    expect(second).toBe(first);
    await first;
  });
});
