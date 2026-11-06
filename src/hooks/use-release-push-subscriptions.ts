'use client';
import { useTRPC } from '@/trpc/client';
import { getOrCreateDeviceId } from '@/utils/device-id';
import { getPushSubscription } from '@/utils/push-notifications/push-manager-utils';
import { useCallback } from 'react';

import { useMutation } from '@tanstack/react-query';

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
 * Neither half may wait for the connection either. The release runs with `networkMode:
 * 'always'`, because a paused mutation would hold the logout and, once the network returned,
 * run under whoever signed in next. For the same reason the browser half is not
 * `unsubscribeFromPushNotifications`: its Server Action is replayed by Next's `useOffline`
 * after the connection returns, never failed. A row the release misses, from before rows
 * carried a device id, points at the endpoint unsubscribed here and is pruned by the next send.
 */
export function useReleasePushSubscriptions(): () => Promise<void> {
  const trpc = useTRPC();
  const { mutateAsync: releaseDevice } = useMutation(
    trpc.nativePush.releaseDevice.mutationOptions({
      networkMode: 'always',
    }),
  );

  return useCallback(async (): Promise<void> => {
    const results = await Promise.allSettled([
      releaseDevice({ deviceId: getOrCreateDeviceId() }),
      getPushSubscription().then((subscription) => subscription?.unsubscribe()),
    ]);
    for (const result of results) {
      if (result.status === 'rejected') {
        console.warn('Releasing push subscriptions on logout failed', result.reason);
      }
    }
  }, [releaseDevice]);
}
