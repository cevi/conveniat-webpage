/**
 * @jest-environment jsdom
 */

import { useReleasePushSubscriptions } from '@/hooks/use-release-push-subscriptions';
import { createTestTrpc } from '@/trpc/test-trpc';
import { onlineManager } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';

const mockReleaseDevice = jest.fn<Promise<{ success: boolean }>, [{ deviceId: string }]>();

// The app's real query client, so its `networkMode` defaults decide whether the release waits.
jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);

jest.mock('@/utils/device-id', () => ({
  getOrCreateDeviceId: (): string => 'device-1',
}));

const mockUnsubscribe = jest.fn<Promise<boolean>, []>();
jest.mock('@/utils/push-notifications/push-manager-utils', () => ({
  getPushSubscription: (): Promise<{ unsubscribe: () => Promise<boolean> }> =>
    Promise.resolve({ unsubscribe: mockUnsubscribe }),
}));

// Offline, Next's `useOffline` holds a Server Action until the connection returns.
jest.mock('@/utils/push-notification-api', () => ({
  unsubscribeUser: (): Promise<never> => new Promise<never>(() => {}),
  subscribeUser: jest.fn(),
}));

const renderRelease = (): (() => Promise<void>) => {
  const { wrapper } = createTestTrpc({
    'nativePush.releaseDevice': (input) => mockReleaseDevice(input as { deviceId: string }),
  });
  return renderHook(() => useReleasePushSubscriptions(), { wrapper }).result.current;
};

describe('useReleasePushSubscriptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockUnsubscribe.mockResolvedValue(true);
  });

  afterEach(() => {
    onlineManager.setOnline(true);
    jest.restoreAllMocks();
  });

  it('releases the device and unsubscribes this browser', async () => {
    mockReleaseDevice.mockResolvedValue({ success: true });

    await renderRelease()();

    expect(mockReleaseDevice).toHaveBeenCalledWith({ deviceId: 'device-1' });
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('settles without a connection, so the logout can go on', async () => {
    onlineManager.setOnline(false);
    mockReleaseDevice.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(renderRelease()()).resolves.toBeUndefined();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
