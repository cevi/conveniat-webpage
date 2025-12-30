'use client';

import { environmentVariables } from '@/config/environment-variables';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { subscribeUser, unsubscribeUser } from '@/utils/push-notification-api';
import {
  getPushSubscription,
  isPushSupported,
  registerServiceWorker,
} from '@/utils/push-notification-utils';
import { urlBase64ToUint8Array } from '@/utils/url-base64-to-uint8-array';
import { useCurrentLocale } from 'next-i18n-router/client';
import { useCallback, useEffect, useState } from 'react';
import type webpush from 'web-push';

const vapidPublicKey: string | undefined = environmentVariables.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

const notificationsBlockedText: Record<Locale, string> = {
  en: 'Notifications blocked. Please enable them in your browser settings.',
  de: 'Benachrichtigungen blockiert. Bitte in den Browsereinstellungen aktivieren.',
  fr: 'Notifications bloquées. Veuillez les activer dans les paramètres du navigateur.',
};

const notificationsIncognitoText: Record<Locale, string> = {
  en: 'Could not enable notifications. You might be in Incognito mode.',
  de: 'Benachrichtigungen konnten nicht aktiviert werden. Möglicherweise Inkognito-Modus.',
  fr: "Impossible d'activer les notifications. Vous êtes peut-être en mode privé.",
};

interface UsePushNotificationStateResult {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  errorMessage: string | undefined;
  toggleSubscription: () => void;
}

export function usePushNotificationState(
  swUrl: string = '/serwist/sw.js',
): UsePushNotificationStateResult {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  useEffect(() => {
    setTimeout(() => {
      setIsSupported(isPushSupported());
    }, 0);
  }, []);

  useEffect(() => {
    if (isSupported) {
      getPushSubscription()
        .then((sub) => {
          if (sub) setSubscription(sub);
        })
        .catch(console.error);
    }
  }, [isSupported]);

  const subscribeToPush = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(undefined);
    try {
      const registration = await registerServiceWorker(swUrl);
      if (!registration) {
        throw new Error('Failed to register service worker for push.');
      }

      if (!vapidPublicKey) {
        throw new Error('VAPID public key is not defined.');
      }

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      setSubscription(sub);
      await subscribeUser(sub.toJSON() as webpush.PushSubscription, locale);
    } catch (error) {
      console.error('Failed to subscribe:', error);
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setErrorMessage(notificationsBlockedText[locale]);
      } else {
        setErrorMessage(notificationsIncognitoText[locale]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [locale, swUrl]);

  const unsubscribeFromPush = useCallback(async (): Promise<void> => {
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

  const toggleSubscription = useCallback((): void => {
    if (subscription) {
      void unsubscribeFromPush();
    } else {
      void subscribeToPush();
    }
  }, [subscription, subscribeToPush, unsubscribeFromPush]);

  return {
    isSupported,
    isSubscribed: !!subscription,
    isLoading,
    errorMessage,
    toggleSubscription,
  };
}
