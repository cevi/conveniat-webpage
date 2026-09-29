/**
 * A VAPID key change silently kills every subscription created with the old key, and no
 * browser tells the service worker about it, so the page has to move the subscription over.
 */
jest.mock('@/config/environment-variables', () => ({
  // 'AQID' is the bytes 1, 2, 3 in base64url.
  environmentVariables: { NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'AQID' },
}));
jest.mock('@/utils/push-notification-api', () => ({
  subscribeUser: jest.fn(),
  unsubscribeUser: jest.fn(),
}));
jest.mock('@/utils/service-worker-utils', () => ({ registerServiceWorker: jest.fn() }));

import { renewPushSubscriptionOnStaleKey } from '@/utils/push-notifications/push-subscription';

const renewedSubscription = {
  toJSON: (): PushSubscriptionJSON => ({
    endpoint: 'https://fcm.googleapis.com/fcm/send/renewed',
    keys: { p256dh: 'renewed-p256dh', auth: 'renewed-auth' },
  }),
};

let mockUnsubscribe: jest.Mock;
let mockSubscribe: jest.Mock;
let mockFetch: jest.Mock;

/** Installs a browser whose current subscription was created with `subscribedKey`. */
const givenSubscriptionWithKey = (subscribedKey: number[]): void => {
  const subscription = {
    options: { userVisibleOnly: true, applicationServerKey: new Uint8Array(subscribedKey).buffer },
    unsubscribe: mockUnsubscribe,
    toJSON: (): PushSubscriptionJSON => ({
      endpoint: 'https://fcm.googleapis.com/fcm/send/stale',
      keys: { p256dh: 'stale-p256dh', auth: 'stale-auth' },
    }),
  };
  const registration = {
    pushManager: {
      getSubscription: jest.fn().mockResolvedValue(subscription),
      subscribe: mockSubscribe,
    },
  };

  Object.assign(globalThis, {
    isSecureContext: true,
    PushManager: class {},
    Notification: { permission: 'granted' },
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      onLine: true,
      userAgent: 'jest',
      serviceWorker: { getRegistration: jest.fn().mockResolvedValue(registration) },
    },
  });
};

beforeEach(() => {
  mockUnsubscribe = jest.fn().mockResolvedValue(true);
  mockSubscribe = jest.fn().mockResolvedValue(renewedSubscription);
  mockFetch = jest.fn().mockResolvedValue({ ok: true });
  globalThis.fetch = mockFetch;
});

describe('renewPushSubscriptionOnStaleKey', () => {
  it('moves a subscription on an old key to the current one and reports both', async () => {
    givenSubscriptionWithKey([4, 5, 6]);

    await renewPushSubscriptionOnStaleKey();

    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(mockSubscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: new Uint8Array([1, 2, 3]),
    });
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      0: {
        json: {
          oldSubscription: {
            endpoint: 'https://fcm.googleapis.com/fcm/send/stale',
            keys: { p256dh: 'stale-p256dh', auth: 'stale-auth' },
          },
          newSubscription: renewedSubscription.toJSON(),
        },
      },
    });
  });

  it('leaves a subscription on the current key alone', async () => {
    givenSubscriptionWithKey([1, 2, 3]);

    await renewPushSubscriptionOnStaleKey();

    expect(mockUnsubscribe).not.toHaveBeenCalled();
    expect(mockSubscribe).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
