'use client';

import {
  sendNotification,
  subscribeUser,
  unsubscribeUser,
} from '@/app/(frontend)/api/push-notifications/actions';
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
  const [message, setMessage] = useState('');

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

  const _sendTestNotification = async (): Promise<void> => {
    if (subscription) {
      await sendNotification(message);
      setMessage('');
    }
  };

  const sendTestNotification = (): void => {
    _sendTestNotification().catch(console.error);
  };

  if (!isSupported) {
    return (
      <div className="mt-20">
        <p>Push notifications are not supported in this browser.</p>
      </div>
    );
  }

  return (
    <div className="mt-20">
      <h3>Push Notifications</h3>
      {subscription ? (
        <>
          <p>You are subscribed to push notifications.</p>
          <button onClick={unsubscribeFromPush}>Unsubscribe</button>
          <input
            type="text"
            placeholder="Enter notification message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <button onClick={sendTestNotification}>Send Test</button>
        </>
      ) : (
        <>
          <p>You are not subscribed to push notifications.</p>
          <button onClick={subscribeToPush}>Subscribe</button>
        </>
      )}
    </div>
  );
};
