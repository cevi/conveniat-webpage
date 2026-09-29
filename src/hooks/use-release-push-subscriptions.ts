'use client';

import { trpc } from '@/trpc/client';
import { getOrCreateDeviceId } from '@/utils/device-id';
import { unsubscribeFromPushNotifications } from '@/utils/push-notifications/push-subscription';
import { useCallback } from 'react';

/**
 * Returns a function that ends this device's push subscriptions for the signed-in user. Await
 * it before `signOut()`: a subscription outlives the session, so without it a shared phone
 * keeps receiving the previous user's chats.
 *
 * The server half deletes every subscription the user holds on this device, native and web,
 * and needs the session to prove whose they are. The browser half unsubscribes the web push
 * subscription as well, because nothing registers it again on the next login: it would stay
 * behind looking subscribed while no row points at it. A native token needs no local step,
 * the shell re-emits it on every page load and it is registered to whoever is signed in then.
 *
 * Failures are logged, not thrown, so a flaky connection never keeps someone from logging out.
 */
export function useReleasePushSubscriptions(): () => Promise<void> {
  const { mutateAsync: releaseDevice } = trpc.nativePush.releaseDevice.useMutation();

  return useCallback(async (): Promise<void> => {
    const results = await Promise.allSettled([
      releaseDevice({ deviceId: getOrCreateDeviceId() }),
      unsubscribeFromPushNotifications(),
    ]);
    for (const result of results) {
      if (result.status === 'rejected') {
        console.warn('Releasing push subscriptions on logout failed', result.reason);
      }
    }
  }, [releaseDevice]);
}
