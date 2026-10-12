/**
 * The server answers a subscription it does not store with `success: false` instead of
 * throwing. Taken for a success, the settings showed push as on while no push could arrive.
 */
jest.mock('@/config/environment-variables', () => ({
  // 'AQID' is the bytes 1, 2, 3 in base64url.
  environmentVariables: { NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'AQID' },
}));
const mockSubscribeUser = jest.fn();
jest.mock('@/utils/push-notification-api', () => ({
  subscribeUser: (...args: unknown[]): unknown => mockSubscribeUser(...args),
  unsubscribeUser: jest.fn(),
}));
const mockRegisterServiceWorker = jest.fn();
jest.mock('@/utils/service-worker-utils', () => ({
  registerServiceWorker: (): unknown => mockRegisterServiceWorker(),
}));
jest.mock('@/utils/device-id', () => ({ getOrCreateDeviceId: (): string => 'device-1' }));

import { subscribeToPushNotifications } from '@/utils/push-notifications/push-subscription';

const mockUnsubscribe = jest.fn().mockResolvedValue(true);
const browserSubscription = {
  unsubscribe: mockUnsubscribe,
  toJSON: (): PushSubscriptionJSON => ({
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
    keys: { p256dh: 'p256dh', auth: 'auth' },
  }),
};

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(globalThis, { Notification: { permission: 'granted' } });
  mockRegisterServiceWorker.mockResolvedValue({
    pushManager: { subscribe: jest.fn().mockResolvedValue(browserSubscription) },
  });
});

describe('subscribeToPushNotifications', () => {
  it('resolves once the server stored the subscription', async () => {
    mockSubscribeUser.mockResolvedValue({ success: true });

    await expect(subscribeToPushNotifications('de')).resolves.toBe(browserSubscription);
    expect(mockUnsubscribe).not.toHaveBeenCalled();
  });

  it('fails and drops the browser subscription when the server refuses it', async () => {
    mockSubscribeUser.mockResolvedValue({ success: false });

    await expect(subscribeToPushNotifications('de')).rejects.toThrow(
      'Failed to send subscription to backend.',
    );
    expect(mockUnsubscribe).toHaveBeenCalled();
    // The answer is the same every time, so asking again only delays the error.
    expect(mockSubscribeUser).toHaveBeenCalledTimes(1);
  });
});
