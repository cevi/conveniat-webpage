import { environmentVariables } from '@/config/environment-variables';
import { subscribeUser, unsubscribeUser } from '@/features/onboarding/api/push-notification';
import {
  getPushSubscription,
  isPushSupported,
  registerServiceWorker,
} from '@/features/onboarding/utils/push-subscription-utils';
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
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | undefined>();

  // Use the robust check on mount
  useEffect(() => {
    setTimeout(() => {
      setIsSupported(isPushSupported());
    }, 0);
  }, []);

  // Check for existing subscription (Pure Check)
  useEffect(() => {
    if (isSupported) {
      getPushSubscription()
        .then((sub) => {
          if (sub) setSubscription(sub);
        })
        .catch(console.error);
    }
  }, [isSupported]);

  const _subscribeToPush = useCallback(async (): Promise<void> => {
    // Explicitly register the service worker first (Recovery/Bootstrap)
    const registration = await registerServiceWorker(swUrl);
    if (!registration) {
      throw new Error('Failed to register service worker for push.');
    }

    if (vapidPublicKey === '') {
      console.error('VAPID public key is not defined.');
      throw new Error('VAPID public key is not defined.');
    }

    // Subscribe using the active registration
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    setSubscription(sub);
    await subscribeUser(sub.toJSON() as webpush.PushSubscription, locale);
  }, [locale, swUrl]);

  const subscribeToPush = useCallback((): void => {
    _subscribeToPush()
      .then(callback)
      .catch((error: unknown) => {
        console.error('Failed to subscribe to push notifications:', error);
        // If subscription fails, it might be due to support issues, but mainly we log.
        // We don't necessarily set isSupported to false unless we know it's a platform error.
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
