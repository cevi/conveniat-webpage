/**
 * A browser can lose its push subscription while the permission stays granted: its push
 * service expires it, or an unregistered service worker takes it along. Nothing else
 * subscribes such a phone again, so it stays silent until someone toggles push in the settings.
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
jest.mock('@/utils/device-id', () => ({ getOrCreateDeviceId: (): string => 'device-1' }));

import { restoreLostPushSubscription } from '@/utils/push-notifications/push-subscription';
import { registerServiceWorker } from '@/utils/service-worker-utils';

jest.mock('@/utils/service-worker-utils', () => ({ registerServiceWorker: jest.fn() }));

const restoredSubscription = {
  unsubscribe: jest.fn(),
  toJSON: (): PushSubscriptionJSON => ({
    endpoint: 'https://fcm.googleapis.com/fcm/send/restored',
    keys: { p256dh: 'restored-p256dh', auth: 'restored-auth' },
  }),
};

let mockSubscribe: jest.Mock;

/** Installs a browser with the given permission, worker and current subscription. */
const givenBrowser = ({
  permission = 'granted',
  onLine = true,
  hasWorker = true,
  subscription = null,
}: {
  permission?: NotificationPermission;
  onLine?: boolean;
  hasWorker?: boolean;
  subscription?: object | null;
}): void => {
  const registration = {
    pushManager: {
      getSubscription: jest.fn().mockResolvedValue(subscription),
      subscribe: mockSubscribe,
    },
  };
  jest.mocked(registerServiceWorker).mockResolvedValue(registration as never);
  Object.assign(globalThis, {
    isSecureContext: true,
    PushManager: class {},
    Notification: { permission },
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      onLine,
      userAgent: 'jest',
      serviceWorker: {
        getRegistration: jest.fn().mockResolvedValue(hasWorker ? registration : undefined),
      },
    },
  });
};

beforeEach(() => {
  mockSubscribe = jest.fn().mockResolvedValue(restoredSubscription);
  mockSubscribeUser.mockReset().mockResolvedValue({ success: true });
});

describe('restoreLostPushSubscription', () => {
  it('subscribes a browser that has the permission but lost its subscription', async () => {
    givenBrowser({});

    await expect(restoreLostPushSubscription('fr')).resolves.toBe(true);

    expect(mockSubscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: new Uint8Array([1, 2, 3]),
    });
    expect(mockSubscribeUser).toHaveBeenCalledWith(
      restoredSubscription.toJSON(),
      'fr',
      'jest',
      undefined,
      'device-1',
    );
  });

  it('leaves a browser that still has its subscription alone', async () => {
    givenBrowser({ subscription: { endpoint: 'https://fcm.googleapis.com/fcm/send/kept' } });

    await expect(restoreLostPushSubscription('de')).resolves.toBe(false);
    expect(mockSubscribe).not.toHaveBeenCalled();
    expect(mockSubscribeUser).not.toHaveBeenCalled();
  });

  it.each([
    ['without the permission', { permission: 'default' as const }],
    ['offline', { onLine: false }],
    ['before the service worker is registered', { hasWorker: false }],
  ])('does nothing %s', async (_, browser) => {
    givenBrowser(browser);

    await expect(restoreLostPushSubscription('de')).resolves.toBe(false);
    expect(mockSubscribe).not.toHaveBeenCalled();
  });
});
