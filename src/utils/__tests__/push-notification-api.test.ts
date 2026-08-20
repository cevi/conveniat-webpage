/**
 * Covers the one hop between the two ends that are already well tested: the chat
 * fan-out knows a chat is an emergency, and `sendFcmNotification` knows how to turn
 * that into a siren channel - but nothing asserted that the value survives the
 * handover in between. Dropping it here silences every emergency alert without a
 * single test or log line failing.
 */
jest.mock('@payload-config', () => ({}), { virtual: true });

jest.mock('payload', () => ({
  getPayload: (): { update: jest.Mock; delete: jest.Mock } => ({
    update: jest.fn(),
    delete: jest.fn(),
  }),
}));

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    NEXT_PUBLIC_APP_HOST_URL: 'https://example.test',
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'public',
    VAPID_PRIVATE_KEY: 'private',
  },
}));

// `auth` is only reached by the subscribe/unsubscribe helpers in this module, but it
// pulls next-auth's untranspiled ESM into the module graph on import alone.
jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
jest.mock('@/utils/auth-helpers', () => ({
  getPayloadUserFromNextAuthUser: jest.fn(),
  isValidNextAuthUser: (): boolean => false,
}));

jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: {
    pushNotificationLog: {
      create: jest.fn().mockResolvedValue({ id: 'log-1' }),
      update: jest.fn().mockResolvedValue({}),
    },
  },
}));

const mockSendFcmNotification = jest.fn().mockResolvedValue({ success: true });
jest.mock('@/lib/firebase-admin', () => ({
  sendFcmNotification: (...args: unknown[]): unknown => mockSendFcmNotification(...args),
}));

import { sendNotificationToSubscription } from '@/utils/push-notification-api';

const nativeSubscription = {
  id: 'sub-1',
  platform: 'android' as const,
  token: 'device-token',
};

interface FcmPayload {
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
});
