jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    NEXT_PUBLIC_APP_HOST_URL: 'https://example.test',
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'public',
    VAPID_PRIVATE_KEY: 'private',
  },
}));

const mockSendWebPush = jest.fn().mockResolvedValue({});
jest.mock('web-push', () => ({
  __esModule: true,
  default: {
    setVapidDetails: jest.fn(),
    sendNotification: (...args: unknown[]): unknown => mockSendWebPush(...args),
  },
}));

const mockSendFcmNotification = jest.fn().mockResolvedValue({ success: true });
jest.mock('@/lib/firebase-admin', () => ({
  sendFcmNotification: (...args: unknown[]): unknown => mockSendFcmNotification(...args),
}));

import { parseRetryAfter, sendPushToDevice } from '@/lib/push/push-transport';

const webDevice = {
  id: 'sub-web',
  platform: 'web' as const,
  endpoint: 'https://push.example.test/abc',
  keys: { p256dh: 'p256dh', auth: 'auth' },
};
const nativeDevice = { id: 'sub-native', platform: 'ios' as const, token: 'device-token' };
const message = { title: 'Züri 11', body: 'Znacht ist bereit' };
const logId = '01926f3c-8a5e-7b3d-9c4f-0a1b2c3d4e5f';
const options = { logId, timeToLiveSeconds: 3600, urgent: false };

const webPushError = (statusCode: number, body = '', headers: Record<string, string> = {}): Error =>
  Object.assign(new Error('Received unexpected response code'), {
    name: 'WebPushError',
    statusCode,
    body,
    headers,
  });

interface WebPushOptions {
  TTL: number;
  urgency: string;
  topic?: string;
  timeout: number;
}

const lastWebPushOptions = (): WebPushOptions =>
  (mockSendWebPush.mock.calls as unknown[][]).at(-1)?.[2] as WebPushOptions;

describe('sendPushToDevice web push', () => {
  beforeEach(() => jest.clearAllMocks());

  // web-push defaults to four weeks, so a phone switched on after the camp got every
  // chat message it missed, and a push service that stopped answering held a send forever.
  it('sends with a time to live, a timeout and the log row as its collapse topic', async () => {
    await sendPushToDevice(webDevice, message, options);

    expect(lastWebPushOptions()).toEqual({
      TTL: 3600,
      urgency: 'normal',
      timeout: 10_000,
      topic: '01926f3c8a5e7b3d9c4f0a1b2c3d4e5f',
    });
  });

  it('asks the push service to wake the device for an urgent push', async () => {
    await sendPushToDevice(webDevice, message, { ...options, urgent: true });

    expect(lastWebPushOptions().urgency).toBe('high');
  });

  it.each([404, 410])('reports a %i as a device that unsubscribed', async (statusCode) => {
    mockSendWebPush.mockRejectedValueOnce(webPushError(statusCode, 'gone'));

    await expect(sendPushToDevice(webDevice, message, options)).resolves.toMatchObject({
      outcome: 'expired',
      statusCode,
    });
  });

  it.each([429, 500, 503])('retries a %i', async (statusCode) => {
    mockSendWebPush.mockRejectedValueOnce(webPushError(statusCode));

    await expect(sendPushToDevice(webDevice, message, options)).resolves.toMatchObject({
      outcome: 'retry',
    });
  });

  it('passes on how long the push service asked to wait', async () => {
    mockSendWebPush.mockRejectedValueOnce(webPushError(429, '', { 'retry-after': '120' }));

    await expect(sendPushToDevice(webDevice, message, options)).resolves.toMatchObject({
      outcome: 'retry',
      retryAfterSeconds: 120,
    });
  });

  it('retries a send that got no answer at all', async () => {
    mockSendWebPush.mockRejectedValueOnce(new Error('Socket timeout'));

    await expect(sendPushToDevice(webDevice, message, options)).resolves.toMatchObject({
      outcome: 'retry',
      error: 'Socket timeout',
    });
  });

  // A rejected VAPID key fails the same way on every attempt; retrying only delays the
  // error line that says so.
  it('does not retry a push the service refuses for good', async () => {
    mockSendWebPush.mockRejectedValueOnce(webPushError(403, 'invalid JWT provided'));

    await expect(sendPushToDevice(webDevice, message, options)).resolves.toEqual(
      expect.objectContaining({
        outcome: 'failed',
        error: 'Push service answered 403: invalid JWT provided',
      }),
    );
  });

  it('fails a subscription without keys without calling the push service', async () => {
    const result = await sendPushToDevice({ ...webDevice, keys: {} }, message, options);

    expect(result.outcome).toBe('failed');
    expect(mockSendWebPush).not.toHaveBeenCalled();
  });
});

describe('sendPushToDevice native', () => {
  beforeEach(() => jest.clearAllMocks());

  it('hands the time to live and the log row on to FCM', async () => {
    await sendPushToDevice(nativeDevice, message, options);

    expect(mockSendFcmNotification).toHaveBeenCalledWith(
      'device-token',
      expect.objectContaining({
        timeToLiveSeconds: 3600,
        data: expect.objectContaining({ notificationId: logId }) as unknown,
      }),
    );
  });

  it('reports a dead token as a device that unsubscribed', async () => {
    mockSendFcmNotification.mockResolvedValueOnce({
      success: false,
      error: 'Requested entity was not found.',
      errorCode: 'messaging/registration-token-not-registered',
    });

    await expect(sendPushToDevice(nativeDevice, message, options)).resolves.toMatchObject({
      outcome: 'expired',
    });
  });

  it('retries while FCM is unavailable', async () => {
    mockSendFcmNotification.mockResolvedValueOnce({
      success: false,
      error: 'The service is currently unavailable.',
      errorCode: 'messaging/server-unavailable',
    });

    await expect(sendPushToDevice(nativeDevice, message, options)).resolves.toMatchObject({
      outcome: 'retry',
      fcmErrorCode: 'messaging/server-unavailable',
    });
  });

  it('does not retry a message FCM will never take', async () => {
    mockSendFcmNotification.mockResolvedValueOnce({
      success: false,
      error: 'Message is too big',
      errorCode: 'messaging/payload-size-limit-exceeded',
    });

    await expect(sendPushToDevice(nativeDevice, message, options)).resolves.toMatchObject({
      outcome: 'failed',
    });
  });
});

describe('parseRetryAfter', () => {
  it('reads seconds and HTTP dates', () => {
    const now = new Date('2027-07-25T08:00:00Z');

    expect(parseRetryAfter('30', now)).toBe(30);
    expect(parseRetryAfter('Sun, 25 Jul 2027 08:01:00 GMT', now)).toBe(60);
    expect(parseRetryAfter('soon', now)).toBeUndefined();
    expect(parseRetryAfter(undefined, now)).toBeUndefined();
  });
});
