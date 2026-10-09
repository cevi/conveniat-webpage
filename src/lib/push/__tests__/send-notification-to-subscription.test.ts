/**
 * Covers the one hop between the two ends that are already well tested: the chat
 * fan-out knows a chat is an emergency, and `sendFcmNotification` knows how to turn
 * that into a siren channel - but nothing asserted that the value survives the
 * handover in between. Dropping it here silences every emergency alert without a
 * single test or log line failing.
 */
jest.mock('@payload-config', () => ({}), { virtual: true });

const mockPayloadDelete = jest.fn();
jest.mock('payload', () => ({
  getPayload: (): { update: jest.Mock; delete: jest.Mock; findGlobal: jest.Mock } => ({
    update: jest.fn(),
    delete: mockPayloadDelete,
    findGlobal: jest.fn().mockResolvedValue({ appShortName: 'Konekta' }),
  }),
}));

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    NEXT_PUBLIC_APP_HOST_URL: 'https://example.test',
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'public',
    VAPID_PRIVATE_KEY: 'private',
  },
}));

const mockLogCreate = jest.fn().mockResolvedValue({ id: 'log-1' });
const mockLogUpdate = jest.fn().mockResolvedValue({});
const mockLogUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: {
    pushNotificationLog: {
      create: (...args: unknown[]): unknown => mockLogCreate(...args),
      update: (...args: unknown[]): unknown => mockLogUpdate(...args),
      updateMany: (...args: unknown[]): unknown => mockLogUpdateMany(...args),
    },
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

import { sendNotificationToSubscription } from '@/lib/push/send-notification-to-subscription';

const nativeSubscription = {
  id: 'sub-1',
  platform: 'android' as const,
  token: 'device-token',
};

interface FcmPayload {
  title: string;
  body: string;
  data: Record<string, string | undefined>;
}

const lastFcmPayload = (): FcmPayload =>
  (mockSendFcmNotification.mock.calls as unknown[][]).at(-1)?.[1] as FcmPayload;

describe('sendNotificationToSubscription native handover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards the emergency type to the FCM payload', async () => {
    await sendNotificationToSubscription(
      nativeSubscription,
      'Notfall von Anna!',
      '/app/chat/chat-1',
      undefined,
      undefined,
      undefined,
      { notificationType: 'emergency' },
    );

    expect(mockSendFcmNotification).toHaveBeenCalledTimes(1);
    expect(lastFcmPayload().data['notificationType']).toBe('emergency');
  });

  it("cuts this deployment's own host down to a path", async () => {
    await sendNotificationToSubscription(
      nativeSubscription,
      'Neues Programm',
      'https://example.test/programm?tag=2',
    );

    expect(lastFcmPayload().data['url']).toBe('/programm?tag=2');
  });

  it('keeps a link to another host, like the short domain, whole', async () => {
    await sendNotificationToSubscription(nativeSubscription, 'AGB', 'https://con27.ch/agbs');

    expect(lastFcmPayload().data['url']).toBe('https://con27.ch/agbs');
  });

  it('leaves the type unset for a regular chat message', async () => {
    await sendNotificationToSubscription(
      nativeSubscription,
      'Bob: hi',
      '/app/chat/chat-1',
      undefined,
      undefined,
      undefined,
      {},
    );

    expect(lastFcmPayload().data['notificationType']).toBeUndefined();
  });

  // The OS renders the body verbatim, so anything the chat's markdown dialect
  // marks up has to be plain text by the time it leaves this function - most
  // visibly the announcement title, which the publish hook wraps in `*…*`.
  it('strips the chat markdown out of the title and the body', async () => {
    await sendNotificationToSubscription(
      nativeSubscription,
      '*Znacht verschoben*\n\nWir essen um _19:30_.',
      '/app/chat/chat-1',
      undefined,
      undefined,
      undefined,
      { title: '*Lagerinfo*' },
    );

    const payload = lastFcmPayload();
    expect(payload.title).toBe('Lagerinfo');
    expect(payload.body).toBe('Znacht verschoben\n\nWir essen um 19:30.');
  });

  // Without an explicit title the notification is named after the app the user
  // installed, which differs between conveniat27 and konekta (#1855).
  it("falls back to this deployment's app name when no title is given", async () => {
    await sendNotificationToSubscription(nativeSubscription, 'Hallo');

    expect(lastFcmPayload().title).toBe('Konekta');
  });
});

/** The shape web-push rejects with: the message is the same for every status code. */
const webPushError = (statusCode: number, body: string): Error =>
  Object.assign(new Error('Received unexpected response code'), {
    name: 'WebPushError',
    statusCode,
    body,
    endpoint: webSubscription.endpoint,
  });

const webSubscription = {
  id: 'sub-2',
  platform: 'web' as const,
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  keys: { p256dh: 'p256dh', auth: 'auth' },
};

describe('sendNotificationToSubscription web push rejections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // The history in the admin panel used to read "Received unexpected response code" for
  // every failure, which hides whether the device left or we sent something broken.
  it("records the push service's answer instead of web-push's generic message", async () => {
    mockSendWebPush.mockRejectedValueOnce(webPushError(403, 'invalid JWT provided\n'));

    const result = await sendNotificationToSubscription(webSubscription, 'Hallo', undefined, 'u1');

    expect(result).toEqual({
      success: false,
      error: 'Push service answered 403: invalid JWT provided',
    });
    expect(mockLogUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'FAILED', error: 'Push service answered 403: invalid JWT provided' },
      }),
    );
    expect(mockPayloadDelete).not.toHaveBeenCalled();
  });

  it('prunes a subscription the push service reports as gone', async () => {
    mockSendWebPush.mockRejectedValueOnce(
      webPushError(410, 'push subscription has unsubscribed or expired.\n'),
    );

    const result = await sendNotificationToSubscription(webSubscription, 'Hallo', undefined, 'u1');

    expect(result).toEqual({
      success: false,
      error: 'Push service answered 410: push subscription has unsubscribed or expired.',
      subscriptionRemoved: true,
    });
    expect(mockPayloadDelete).toHaveBeenCalledWith({
      collection: 'push-notification-subscriptions',
      where: { endpoint: { equals: webSubscription.endpoint } },
    });
  });
});

describe('sendNotificationToSubscription payload size', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // RFC 8291 leaves 3993 bytes of plaintext; above that the push service refuses the send
  // for every recipient. The whole text is one tap away, in the chat the push opens.
  it('sends a long announcement as a preview that fits the push service', async () => {
    const announcement = 'Liebe Leitende, morgen startet das Gesamtlager! 🎉\n'.repeat(200);

    await sendNotificationToSubscription(webSubscription, announcement, '/app/chat/chat-1', 'u1');

    const sentPayload = (mockSendWebPush.mock.calls as unknown[][]).at(-1)?.[1] as string;
    expect(new TextEncoder().encode(sentPayload).length).toBeLessThanOrEqual(3993);
    expect((JSON.parse(sentPayload) as { body: string }).body.endsWith('…')).toBe(true);
  });
});

describe('sendNotificationToSubscription log row', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('records what the push is about', async () => {
    await sendNotificationToSubscription(
      webSubscription,
      'Notfall!',
      undefined,
      'u1',
      undefined,
      undefined,
      { kind: 'EMERGENCY' },
    );

    expect(mockLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ kind: 'EMERGENCY', channel: 'WEB_PUSH' }) as unknown,
    });
  });

  /**
   * The push service accepting a push says nothing about the device, so the row stays
   * short of DELIVERED. The device may report back before the send returns, and its
   * DELIVERED must survive the update.
   */
  it('marks an accepted push as sent without overwriting a device receipt', async () => {
    const result = await sendNotificationToSubscription(webSubscription, 'Hallo', undefined, 'u1');

    expect(result).toEqual({ success: true });
    expect(mockLogUpdateMany).toHaveBeenCalledWith({
      where: { id: 'log-1', status: 'PENDING' },
      data: { status: 'SENT' },
    });
    expect(mockLogUpdate).not.toHaveBeenCalled();
  });
});
