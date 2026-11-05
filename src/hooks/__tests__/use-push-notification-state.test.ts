/**
 * @jest-environment jsdom
 */

import { usePushNotificationState } from '@/hooks/use-push-notification-state';
import { writePreference } from '@/lib/preferences';
import { getPushSubscription } from '@/utils/push-notifications/push-manager-utils';
import { act, renderHook, waitFor } from '@testing-library/react';

jest.mock('@/lib/preferences', () => ({ writePreference: jest.fn() }));
jest.mock('@/hooks/use-service-worker-status', () => ({
  useServiceWorkerStatus: (): { isReady: boolean; error: undefined } => ({
    isReady: true,
    error: undefined,
  }),
}));
jest.mock('@/utils/push-notifications/push-manager-utils', () => ({
  isPushSupported: (): boolean => true,
  // no subscription unless a test gives one
  getPushSubscription: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/utils/push-notifications/push-subscription', () => ({
  subscribeToPushNotifications: jest.fn(() => Promise.resolve({})),
  unsubscribeFromPushNotifications: jest.fn(() => Promise.resolve()),
}));

/**
 * The app subscribes a browser that lost its subscription again on start, so turning push off
 * has to be written down: without the record the next start would undo it.
 */
describe('the push toggle records what the user chose', () => {
  beforeEach(() => {
    Object.assign(globalThis, { Notification: { permission: 'granted' } });
    jest.mocked(writePreference).mockClear();
  });

  it('records turning push off', async () => {
    jest.mocked(getPushSubscription).mockResolvedValueOnce({} as PushSubscription);
    const { result } = renderHook(() => usePushNotificationState({ locale: 'de' }));
    await waitFor(() => expect(result.current.isSubscribed).toBe(true));

    await act(() => result.current.toggleSubscription());

    expect(writePreference).toHaveBeenCalledWith('web-push-opted-out', true);
  });

  it('clears the record when push is turned on again', async () => {
    const { result } = renderHook(() => usePushNotificationState({ locale: 'de' }));
    await waitFor(() => expect(result.current.isChecked).toBe(true));

    await act(() => result.current.toggleSubscription());

    expect(writePreference).toHaveBeenCalledWith('web-push-opted-out', false);
  });
});
