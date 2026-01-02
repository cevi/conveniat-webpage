'use client';

import { skipPushNotificationText } from '@/features/onboarding/components/push-notification-manager';
import { offlineContentNotNowButton } from '@/features/onboarding/onboarding-constants';
import type { StaticTranslationString } from '@/types/types';
import { Cookie } from '@/types/types';
import { unsubscribeUser } from '@/utils/push-notification-api';
import {
  getPushSubscription,
  isPushSupported,
  subscribeToPushNotifications,
} from '@/utils/push-notification-utils';
import Cookies from 'js-cookie';
import React, { useCallback, useEffect, useState } from 'react';
import type webpush from 'web-push';

const notSupportedBrowserText: StaticTranslationString = {
  en: 'Push notifications are not supported in this browser.',
  de: 'Push-Benachrichtigungen werden in diesem Browser nicht unterstützt.',
  fr: 'Les notifications push ne sont pas prises en charge dans ce navigateur.',
};

const notSupportedDeviceText: StaticTranslationString = {
  en: 'Push notifications are not supported on this device.',
  de: 'Push-Benachrichtigungen werden auf diesem Gerät nicht unterstützt.',
  fr: 'Les notifications push ne sont pas prises en charge sur cet appareil.',
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
}> = ({ callback, locale, swUrl = '/sw.js' }) => {
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
      // Subscribe using the active registration
      const sub = await subscribeToPushNotifications(swUrl, locale);
      setSubscription(sub);
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
    const isStandalone =
      typeof globalThis !== 'undefined' &&
      globalThis.matchMedia('(display-mode: standalone)').matches;

    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-center gap-2 rounded-lg bg-gray-100 p-3 text-gray-600">
          <span className="font-semibold text-balance">
            {isStandalone ? notSupportedDeviceText[locale] : notSupportedBrowserText[locale]}
          </span>
        </div>
        <button
          onClick={callback}
          className="font-heading w-full transform cursor-pointer rounded-[8px] bg-gray-400 px-8 py-3 text-center text-lg leading-normal font-bold text-white shadow-md duration-100 hover:scale-[1.02] hover:bg-gray-500 active:scale-[0.98]"
        >
          {offlineContentNotNowButton[locale]}
        </button>
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

        <button
          onClick={() => {
            Cookies.set(Cookie.SKIP_PUSH_NOTIFICATION, 'true', { expires: 7 });
            callback();
          }}
          className="mt-3 cursor-pointer font-semibold text-gray-400 hover:text-gray-600"
        >
          {skipPushNotificationText[locale]}
        </button>
      </>
    </div>
  );
};
