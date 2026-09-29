const mockFind = jest.fn();
const mockCount = jest.fn();

jest.mock('@payload-config', () => ({}), { virtual: true });

jest.mock('payload', () => ({
  getPayload: (): { find: jest.Mock; count: jest.Mock } => ({ find: mockFind, count: mockCount }),
}));

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { APP_HOST_URL: 'https://example.test' },
}));

const mockSendToSubscription = jest.fn().mockResolvedValue({ success: true });
jest.mock('@/utils/push-notification-api', () => ({
  sendNotificationToSubscription: (...args: unknown[]): unknown => mockSendToSubscription(...args),
}));

// The factory has to build the logger itself: `jest.mock` is hoisted above any const
// it would close over, and the module under test calls `createLogger` on load.
jest.mock('@/utils/server-logger', () => {
  const logger = {
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
  };
  return { createLogger: (): typeof logger => logger, __logger: logger };
});

interface MockLogger {
  debug: jest.Mock;
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
}

const { __logger: mockLogger } = jest.requireMock<{ __logger: MockLogger }>(
  '@/utils/server-logger',
);

import { sendNotification } from '@/features/chat/api/utils/send-push-notifications';
import { PushNotificationKind } from '@/lib/prisma';

const chat = { kind: PushNotificationKind.CHAT };

interface FindArguments {
  limit?: number;
  pagination?: boolean;
}

describe('sendNotification recipient lookup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // The collection is non-empty; the early return on an empty collection is a
    // separate short-circuit that would hide the lookup under test.
    mockCount.mockResolvedValue({ totalDocs: 3 });
  });

  /**
   * Payload applies an explicit `limit` even when `pagination` is false
   * (`sanitizedLimit = limit ?? (usePagination ? 10 : 0)`), so a hardcoded limit here
   * silently drops every recipient past it — no error, no log. A few hundred people
   * with two devices each is enough to reach the old cap of 1000.
   */
  it('does not cap the recipient lookup', async () => {
    mockFind.mockResolvedValue({ docs: [] });

    await sendNotification('hi', ['user-1'], 'chat-1', undefined, chat);

    const findArguments = (mockFind.mock.calls as unknown[][])[0]?.[0] as FindArguments;
    expect(findArguments.pagination).toBe(false);
    expect(findArguments.limit).toBeUndefined();
  });

  it('sends to every returned subscription', async () => {
    mockFind.mockResolvedValue({
      docs: [
        { id: 's1', user: 'user-1' },
        { id: 's2', user: 'user-2' },
        { id: 's3', user: 'user-2' },
      ],
    });

    await sendNotification('hi', ['user-1', 'user-2'], 'chat-1', undefined, chat);

    expect(mockSendToSubscription).toHaveBeenCalledTimes(3);
  });

  /**
   * The notification type is what decides between the regular chat channel and the
   * emergency channel with its siren, and the decision is made by the caller (only it
   * knows the chat is an emergency). Dropping it here would silence the alert on every
   * device without anything failing.
   */
  it('passes the emergency type on to every subscription', async () => {
    mockFind.mockResolvedValue({
      docs: [
        { id: 's1', user: 'user-1' },
        { id: 's2', user: 'user-2' },
      ],
    });

    await sendNotification('Notfall!', ['user-1', 'user-2'], 'chat-1', undefined, {
      kind: PushNotificationKind.EMERGENCY,
      notificationType: 'emergency',
    });

    for (const call of mockSendToSubscription.mock.calls as unknown[][]) {
      expect(call[6]).toEqual(expect.objectContaining({ notificationType: 'emergency' }));
    }
  });

  it('leaves the type unset for a regular chat message', async () => {
    mockFind.mockResolvedValue({ docs: [{ id: 's1', user: 'user-1' }] });

    await sendNotification('hi', ['user-1'], 'chat-1', undefined, chat);

    const options = (mockSendToSubscription.mock.calls as unknown[][])[0]?.[6] as Record<
      string,
      unknown
    >;
    expect(options['notificationType']).toBeUndefined();
  });

  it('reports success without querying when nobody is subscribed', async () => {
    mockFind.mockResolvedValue({ docs: [] });

    const result = await sendNotification('hi', ['user-1'], 'chat-1', undefined, chat);

    expect(result.success).toBe(true);
    expect(mockSendToSubscription).not.toHaveBeenCalled();
  });
});

/** Mirrors `PUSH_FANOUT_CONCURRENCY` in the module under test. */
const EXPECTED_CONCURRENCY_CEILING = 25;

describe('sendNotification fan-out', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCount.mockResolvedValue({ totalDocs: 200 });
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    mockSendToSubscription.mockReset();
    mockSendToSubscription.mockResolvedValue({ success: true });
  });

  /**
   * The recipient lookup is deliberately uncapped, so the only thing standing between
   * a camp-wide chat and a thousand simultaneous log writes plus push requests is this
   * ceiling. Without it the sends fail on prisma pool acquisition, not on anything the
   * push code can report on.
   */
  it('caps the number of sends in flight', async () => {
    mockFind.mockResolvedValue({
      docs: Array.from({ length: 200 }, (_, index) => ({ id: `s${index}`, user: 'user-1' })),
    });

    let inFlight = 0;
    let peakInFlight = 0;
    mockSendToSubscription.mockImplementation(async () => {
      inFlight++;
      peakInFlight = Math.max(peakInFlight, inFlight);
      await new Promise((resolve) => setImmediate(resolve));
      inFlight--;
      return { success: true };
    });

    await sendNotification('hi', ['user-1'], 'chat-1', undefined, chat);

    expect(mockSendToSubscription).toHaveBeenCalledTimes(200);
    expect(peakInFlight).toBeLessThanOrEqual(EXPECTED_CONCURRENCY_CEILING);
    // Still a fan-out, not a serial loop - one send per tick would take minutes.
    expect(peakInFlight).toBeGreaterThan(1);
  });

  it('keeps sending after one subscription throws, and reports the failure', async () => {
    mockFind.mockResolvedValue({
      docs: [
        { id: 's1', user: 'user-1' },
        { id: 's2', user: 'user-1' },
        { id: 's3', user: 'user-1' },
      ],
    });
    mockSendToSubscription
      .mockRejectedValueOnce(new Error('push endpoint gone'))
      .mockResolvedValue({ success: true });

    const result = await sendNotification('hi', ['user-1'], 'chat-1', undefined, chat);

    expect(mockSendToSubscription).toHaveBeenCalledTimes(3);
    expect(result.success).toBe(false);
  });

  /**
   * The whole point of the fan-out summary: "the chat notified nobody" has to be
   * answerable. An expired device is the normal end of a subscription, not a failure, but
   * it is exactly what separates "reached 40 devices" from "reached none of them".
   */
  it('reports accepted, expired, failed and thrown counts on the fan-out log line', async () => {
    mockFind.mockResolvedValue({
      docs: [
        { id: 's1', user: 'user-1' },
        { id: 's2', user: 'user-1' },
        { id: 's3', user: 'user-1' },
      ],
    });
    mockSendToSubscription
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, error: 'gone', subscriptionRemoved: true })
      .mockResolvedValueOnce({ success: true });

    await sendNotification('hi', ['user-1', 'user-2'], 'chat-1', undefined, chat);

    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Push fan-out finished',
      expect.objectContaining({
        'push.kind': 'CHAT',
        'push.recipients': 2,
        'push.recipients_without_device': 1,
        'push.subscriptions': 3,
        'push.accepted': 2,
        'push.expired': 1,
        'push.failed': 0,
        'push.thrown': 0,
        'chat.id': 'chat-1',
      }),
    );
    expect(mockLogger.info).not.toHaveBeenCalled();
  });

  it('records the kind on every send', async () => {
    mockFind.mockResolvedValue({ docs: [{ id: 's1', user: 'user-1' }] });

    await sendNotification('hi', ['user-1'], 'chat-1', 'message-1', {
      kind: PushNotificationKind.ANNOUNCEMENT,
    });

    expect((mockSendToSubscription.mock.calls as unknown[][])[0]?.[6]).toEqual(
      expect.objectContaining({ kind: 'ANNOUNCEMENT' }),
    );
  });

  /**
   * Whether the piket was woken up must be answerable from Loki, where production keeps
   * no debug lines, and not only from a trace that was sampled at 25%.
   */
  it('logs an emergency fan-out at info even when every send went through', async () => {
    mockFind.mockResolvedValue({ docs: [{ id: 's1', user: 'user-1' }] });

    await sendNotification('Notfall!', ['user-1'], 'chat-1', undefined, {
      kind: PushNotificationKind.EMERGENCY,
      notificationType: 'emergency',
    });

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Push fan-out finished',
      expect.objectContaining({ 'push.kind': 'EMERGENCY', 'push.accepted': 1 }),
    );
  });

  it('logs an emergency that reached no device at info', async () => {
    mockFind.mockResolvedValue({ docs: [] });

    await sendNotification('Notfall!', ['user-1'], 'chat-1', undefined, {
      kind: PushNotificationKind.EMERGENCY,
    });

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Push fan-out reached no device',
      expect.objectContaining({ 'push.recipients_without_device': 1 }),
    );
  });

  it('logs a chat fan-out at info when none of its devices accepted the push', async () => {
    mockFind.mockResolvedValue({ docs: [{ id: 's1', user: 'user-1' }] });
    mockSendToSubscription.mockResolvedValueOnce({ success: false, error: '500' });

    await sendNotification('hi', ['user-1'], 'chat-1', undefined, chat);

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Push fan-out finished',
      expect.objectContaining({ 'push.accepted': 0, 'push.failed': 1 }),
    );
  });
});
