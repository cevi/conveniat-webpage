'use client';

import { subscribeUser, unsubscribeUser } from '@/app/(api)/api/push-notifications/actions';
import { urlBase64ToUint8Array } from '@/utils/url-base64-to-uint8-array';
import React, { useEffect, useState } from 'react';
import webpush from 'web-push';

const vapidPublicKey: string | undefined = process.env['NEXT_PUBLIC_VAPID_PUBLIC_KEY'];
if (vapidPublicKey === undefined) {
  throw new Error('VAPID public key is not defined');
} else if (vapidPublicKey === '') {
  throw new Error('VAPID public key is empty');
}

/**
 * PushNotificationManager is a React component that manages push notifications.
 * @constructor
 */
export const PushNotificationManager = (): React.JSX.Element => {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | undefined>();

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in globalThis) {
      setIsSupported(true);
      _registerServiceWorker().catch(console.error);
    }
  }, []);

  const _registerServiceWorker = async (): Promise<void> => {
    const registration: ServiceWorkerRegistration = await navigator.serviceWorker.register(
      '/sw.js',
      {
        scope: '/',
        updateViaCache: 'none',
      },
    );
    const sub = await registration.pushManager.getSubscription();
    if (sub) setSubscription(sub);
  };

  const _subscribeToPush = async (): Promise<void> => {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    setSubscription(sub);
    // structured clone algorithm does not work here
    await subscribeUser(sub.toJSON() as webpush.PushSubscription);
  };

  const subscribeToPush = (): void => {
    _subscribeToPush().catch(console.error);
  };

  const _unsubscribeFromPush = async (): Promise<void> => {
    await unsubscribeUser(subscription?.toJSON() as webpush.PushSubscription);
    await subscription?.unsubscribe();
    setSubscription(undefined);
  };

  const unsubscribeFromPush = (): void => {
    _unsubscribeFromPush().catch(console.error);
  };

  if (!isSupported) {
    return (
      <>
        <h1 className="mb-4 text-2xl font-semibold">Push Notifications</h1>
        <p className="mb-4 text-balance text-gray-700">
          Push notifications are not supported in this browser.
        </p>
      </>
    );
  }

  return (
    <div className="mb-8">
      <h1 className="mb-4 text-2xl font-semibold">Push Notifications</h1>
      {subscription ? (
        <>
          <p className="mb-4 text-balance text-gray-700">
            You are subscribed to push notifications.
          </p>
          <button
            className="rounded-[8px] bg-red-700 px-8 py-3 text-center font-heading text-lg font-bold leading-normal text-red-100 hover:bg-red-800"
            onClick={unsubscribeFromPush}
          >
            Unsubscribe
          </button>
        </>
      ) : (
        <>
          <p className="mb-4 text-balance text-gray-700">
            You are not subscribed to push notifications.
          </p>
          <button
            className="rounded-[8px] bg-red-700 px-8 py-3 text-center font-heading text-lg font-bold leading-normal text-red-100 hover:bg-red-800"
            onClick={subscribeToPush}
          >
            Subscribe
          </button>
        </>
      )}
    </div>
  );
};
