import { environmentVariables } from '@/config/environment-variables';
import { subscribeUser, unsubscribeUser } from '@/features/onboarding/api/push-notification';
import type { StaticTranslationString } from '@/types/types';
import { urlBase64ToUint8Array } from '@/utils/url-base64-to-uint8-array';
import React, { useCallback, useEffect, useState } from 'react';
import type webpush from 'web-push';

const vapidPublicKey: string | undefined = environmentVariables.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

const notSupportedText: StaticTranslationString = {
  en: 'Push notifications are not supported in this browser.',
  de: 'Push-Benachrichtigungen werden in diesem Browser nicht unterstützt.',
  fr: 'Les notifications push ne sont pas prises en charge dans ce navigateur.',
};

const notYetSubscribed: StaticTranslationString = {
  en: 'You are not subscribed to push notifications.',
  de: 'Du bist nicht für Push-Benachrichtigungen angemeldet.',
  fr: "Vous n'êtes pas abonné aux notifications push.",
};

const subscribedText: StaticTranslationString = {
  en: 'You are subscribed to push notifications.',
  de: 'Du bist für Push-Benachrichtigungen angemeldet.',
  fr: 'Vous êtes abonné aux notifications push.',
};

const subscribeAcceptedText: StaticTranslationString = {
  en: 'Enable Notifications',
  de: 'Benachrichtigungen aktivieren',
  fr: 'Activer les notifications',
};

const unsubscribeAcceptedText: StaticTranslationString = {
  en: 'Disable Notifications',
  de: 'Benachrichtigungen deaktivieren',
  fr: 'Désactiver les notifications',
};

/**
 * PushNotificationManager is a React component that manages push notifications.
 * @constructor
 */
export const PushNotificationSubscriptionManager: React.FC<{
  callback: () => void;
  locale: 'de' | 'fr' | 'en';
  swUrl?: string;
}> = ({ callback, locale, swUrl = '/api/serwist/sw.js' }) => {
  const [isSupported, setIsSupported] = useState(() => {
    return (
      typeof navigator !== 'undefined' &&
      'serviceWorker' in navigator &&
      typeof globalThis !== 'undefined' &&
      'PushManager' in globalThis
    );
  });
  const [subscription, setSubscription] = useState<PushSubscription | undefined>();

  const _registerServiceWorker = useCallback(async (): Promise<PushSubscription | null> => {
    const registration: ServiceWorkerRegistration = await navigator.serviceWorker.register(swUrl, {
      scope: '/',
      updateViaCache: 'none',
    });

    return await registration.pushManager.getSubscription();
  }, [swUrl]);

  useEffect(() => {
    if (isSupported) {
      _registerServiceWorker()
        .then((sub) => {
          if (sub) setSubscription(sub);
        })
        .catch(console.error);
    }
  }, [isSupported, _registerServiceWorker]);

  const _subscribeToPush = useCallback(async (): Promise<void> => {
    const registration = await navigator.serviceWorker.ready;
    if (vapidPublicKey === '') {
      console.error('VAPID public key is not defined.');
      throw new Error('VAPID public key is not defined.');
    }
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    setSubscription(sub);
    await subscribeUser(sub.toJSON() as webpush.PushSubscription, locale);
  }, [locale]);

  const subscribeToPush = useCallback((): void => {
    _subscribeToPush()
      .then(callback)
      .catch((error: unknown) => {
        console.error('Failed to subscribe to push notifications:', error);
        setIsSupported(false);
      });
  }, [_subscribeToPush, callback]);

  const _unsubscribeFromPush = useCallback(async (): Promise<void> => {
    if (!subscription) return;
    await unsubscribeUser(subscription.toJSON() as webpush.PushSubscription);
    await subscription.unsubscribe();
    setSubscription(undefined);
  }, [subscription]);

  const unsubscribeFromPush = useCallback((): void => {
    _unsubscribeFromPush().catch(console.error);
  }, [_unsubscribeFromPush]);

  if (!isSupported) {
    return (
      <>
        <p className="mb-4 text-balance text-gray-700">{notSupportedText[locale]}</p>
      </>
    );
  }

  return (
    <div className="mb-8">
      <>
        <p className="mb-4 text-balance text-gray-700">
          {subscription ? subscribedText[locale] : notYetSubscribed[locale]}
        </p>
        <button
          className="font-heading rounded-[8px] bg-red-700 px-8 py-3 text-center text-lg leading-normal font-bold text-red-100 duration-100 hover:bg-red-800"
          onClick={subscription ? unsubscribeFromPush : subscribeToPush}
        >
          {subscription ? unsubscribeAcceptedText[locale] : subscribeAcceptedText[locale]}
        </button>
      </>
    </div>
  );
};
