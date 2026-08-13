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

import { sendNotification } from '@/features/chat/api/utils/send-push-notifications';

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

    await sendNotification('hi', ['user-1'], 'chat-1');

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

    await sendNotification('hi', ['user-1', 'user-2'], 'chat-1');

    expect(mockSendToSubscription).toHaveBeenCalledTimes(3);
  });

  it('reports success without querying when nobody is subscribed', async () => {
    mockFind.mockResolvedValue({ docs: [] });

    const result = await sendNotification('hi', ['user-1'], 'chat-1');

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

    await sendNotification('hi', ['user-1'], 'chat-1');

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

    const result = await sendNotification('hi', ['user-1'], 'chat-1');

    expect(mockSendToSubscription).toHaveBeenCalledTimes(3);
    expect(result.success).toBe(false);
  });
});
