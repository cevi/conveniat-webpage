/**
 * @jest-environment jsdom
 */

import { usePushNotificationState } from '@/hooks/use-push-notification-state';
import { writePreference } from '@/lib/preferences';
import { getPushSubscription } from '@/utils/push-notifications/push-manager-utils';
import { PushSubscribeError } from '@/utils/push-notifications/push-subscribe-error';
import { subscribeToPushNotifications } from '@/utils/push-notifications/push-subscription';
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

/**
 * Every failure used to read "You might be in Incognito mode" and left the button disabled, so
 * a dropped connection or a closed prompt ended the step.
 */
describe('a failed subscription says why and whether to try again', () => {
  const subscribe = jest.mocked(subscribeToPushNotifications);

  beforeEach(() => {
    Object.assign(globalThis, { Notification: { permission: 'default' } });
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  });

  afterEach(() => jest.restoreAllMocks());

  const failWith = async (
    error: unknown,
  ): Promise<{ errorMessage: string | undefined; isBlocked: boolean }> => {
    subscribe.mockRejectedValueOnce(error);
    const { result } = renderHook(() => usePushNotificationState({ locale: 'en' }));
    await waitFor(() => expect(result.current.isChecked).toBe(true));
    await act(() => result.current.toggleSubscription());
    return result.current;
  };

  it('asks for a retry when the server did not store it', async () => {
    const state = await failWith(new PushSubscribeError('server', 'refused'));
    expect(state).toMatchObject({
      errorMessage: 'Notifications could not be saved. Please try again.',
      isBlocked: false,
    });
  });

  it('says the connection is gone when offline', async () => {
    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const state = await failWith(new PushSubscribeError('server', 'fetch failed'));
    expect(state).toMatchObject({
      errorMessage: 'No connection. Try again once you are online.',
      isBlocked: false,
    });
  });

  it('keeps the private-window hint for a failing push service only', async () => {
    const state = await failWith(new PushSubscribeError('push-service', 'abort'));
    expect(state.errorMessage).toContain('private window');
    expect(state.isBlocked).toBe(false);
  });

  it('asks again after a closed prompt', async () => {
    const state = await failWith(new PushSubscribeError('dismissed', 'not allowed'));
    expect(state).toMatchObject({
      errorMessage: 'Notifications were not allowed. Tap again to allow them.',
      isBlocked: false,
    });
  });

  it('points to the browser settings when blocked, where a retry cannot help', async () => {
    const state = await failWith(new PushSubscribeError('blocked', 'denied'));
    expect(state).toMatchObject({
      errorMessage: 'Notifications blocked. Please enable them in your browser settings.',
      isBlocked: true,
    });
  });
});
