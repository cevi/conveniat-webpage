/**
 * @jest-environment jsdom
 */

import { useReleasePushSubscriptions } from '@/hooks/use-release-push-subscriptions';
import { makeQueryClient } from '@/trpc/query-client';
import type { UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { onlineManager, QueryClientProvider, useMutation } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type React from 'react';

const mockReleaseDevice = jest.fn<Promise<{ success: boolean }>, [{ deviceId: string }]>();

// The real hook from TanStack, so the app's `networkMode` defaults decide whether it waits.
jest.mock('@/trpc/client', () => ({
  trpc: {
    nativePush: {
      releaseDevice: {
        useMutation: (
          options?: UseMutationOptions<{ success: boolean }, Error, { deviceId: string }>,
        ): UseMutationResult<{ success: boolean }, Error, { deviceId: string }> =>
          useMutation({ ...options, mutationFn: mockReleaseDevice }),
      },
    },
  },
}));

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
  const queryClient = makeQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }): React.ReactNode => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
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

    expect(mockReleaseDevice).toHaveBeenCalledWith({ deviceId: 'device-1' }, expect.anything());
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('settles without a connection, so the logout can go on', async () => {
    onlineManager.setOnline(false);
    mockReleaseDevice.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(renderRelease()()).resolves.toBeUndefined();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
