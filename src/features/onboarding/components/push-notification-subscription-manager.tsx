'use client';

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

const notificationsBlockedText: StaticTranslationString = {
  en: 'Notifications blocked. Please enable them in your browser settings.',
  de: 'Benachrichtigungen blockiert. Bitte aktivieren Sie diese in Ihren Browsereinstellungen.',
  fr: 'Notifications bloquées. Veuillez les activer dans les paramètres de votre navigateur.',
};

const notificationsIncognitoText: StaticTranslationString = {
  en: 'Could not enable notifications. You might be in Incognito mode.',
  de: 'Benachrichtigungen konnten nicht aktiviert werden. Möglicherweise befinden Sie sich im Inkognito-Modus.',
  fr: "Impossible d'activer les notifications. Vous êtes peut-être en mode navigation privée.",
};

/**
 * PushNotificationManager is a React component that manages push notifications.
 * @constructor
 */
export const PushNotificationSubscriptionManager: React.FC<{
  callback: () => void;
  locale: 'de' | 'fr' | 'en';
  swUrl?: string;
}> = ({ callback, locale, swUrl = '/serwist/sw.js' }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  // Use the robust check on mount
  useEffect(() => {
    // Check permission status immediately
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
      // If already denied, we can't do much. Just consider it not supported for the purpose of the UI flow
      // or let the user manually enable it (which is hard).
      // For now, we just don't set isSupported to true? Or we handle it in subscription.
    }

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

  const handleToggleSubscription = (): void => {
    if (subscription) {
      void _unsubscribeFromPush();
    } else {
      void _subscribeToPush();
    }
  };

  const _subscribeToPush = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(undefined);
    try {
      // Explicitly register the service worker first (Recovery/Bootstrap)
      const registration = await registerServiceWorker(swUrl);
      if (!registration) {
        throw new Error('Failed to register service worker for push.');
      }

      if (!vapidPublicKey) {
        throw new Error('VAPID public key is not defined.');
      }

      // Subscribe using the active registration
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      setSubscription(sub);
      await subscribeUser(sub.toJSON() as webpush.PushSubscription, locale);
      callback();
    } catch (error) {
      console.error('Failed to subscribe:', error);
      // Check if it's a permission denied error or incognito issue
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setErrorMessage(notificationsBlockedText[locale]);
      } else {
        setErrorMessage(notificationsIncognitoText[locale]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [locale, swUrl, callback]);

  // ... (unsubscribe remains same) ...

  const _unsubscribeFromPush = useCallback(async (): Promise<void> => {
    if (!subscription) return;
    setIsLoading(true);
    try {
      await unsubscribeUser(subscription.toJSON() as webpush.PushSubscription);
      await subscription.unsubscribe();
      setSubscription(undefined);
    } catch (error) {
      console.error('Unsubscribe failed', error);
    } finally {
      setIsLoading(false);
    }
  }, [subscription]);

  if (!isSupported) {
    return (
      <div className="mb-8">
        <p className="mb-4 text-balance text-gray-700">{notSupportedText[locale]}</p>
      </div>
    );
  }

  return (
    <div className="mb-0 flex flex-col items-center">
      <>
        <p className="mb-4 text-balance text-gray-700">
          {subscription ? subscribedText[locale] : notYetSubscribed[locale]}
        </p>

        {errorMessage && (
          <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-600">{errorMessage}</p>
        )}

        <button
          className="font-heading flex cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-red-700 px-8 py-3 text-center text-lg leading-normal font-bold text-red-100 duration-100 hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={handleToggleSubscription}
          disabled={isLoading || !!errorMessage}
        >
          {isLoading && (
            <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {subscription ? unsubscribeAcceptedText[locale] : subscribeAcceptedText[locale]}
        </button>
      </>
    </div>
  );
};
