'use client';

import { useServiceWorkerStatus } from '@/hooks/use-service-worker-status';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import {
  getPushSubscription,
  isPushSupported,
} from '@/utils/push-notifications/push-manager-utils';
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from '@/utils/push-notifications/push-subscription';
import { useCurrentLocale } from 'next-i18n-router/client';
import { useCallback, useEffect, useState } from 'react';

// TODO: extract to i18n file or constants
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
  toggleSubscription: () => Promise<boolean>;
}

export function usePushNotificationState(): UsePushNotificationStateResult {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  // Use shared hook to check SW readiness (2s timeout)
  const { isReady: swReady, error: swError } = useServiceWorkerStatus(2000);

  useEffect(() => {
    let mounted = true;

    const checkSubscription = async (): Promise<void> => {
      const supported = isPushSupported();
      if (mounted) setIsSupported(supported);

      if (!supported) return;

      if (Notification.permission === 'denied' && mounted) {
        setErrorMessage(notificationsBlockedText[locale]);
      }

      // If SW failed or timed out, we assume failure (silent check)
      if (swError) {
        console.warn('SW check failed or timed out:', swError);
        return;
      }

      if (!swReady) return;

      try {
        const sub = await getPushSubscription();
        if (mounted) {
          setIsSubscribed(!!sub);
        }
      } catch (error) {
        console.warn('Failed to check push subscription:', error);
      }
    };

    void checkSubscription();

    return (): void => {
      mounted = false;
    };
  }, [locale, swReady, swError]);

  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setErrorMessage(undefined);
    try {
      await subscribeToPushNotifications(locale);

      setIsSubscribed(true);
      return true;
    } catch (error: unknown) {
      // Check for known errors (Incognito, blocked) to avoid console.error
      const message = error instanceof Error ? error.message : String(error);
      const cause = error instanceof Error ? (error as { cause?: unknown }).cause : undefined;
      const causeMessage = cause instanceof Error ? cause.message : '';

      const isBlocked =
        message.toLowerCase().includes('blocked') ||
        (error instanceof DOMException && error.name === 'NotAllowedError');

      const isIncognito =
        message.toLowerCase().includes('failed to subscribe to push manager') &&
        (causeMessage.toLowerCase().includes('permission denied') ||
          causeMessage.toLowerCase().includes('registration failed'));

      if (isBlocked || isIncognito) {
        console.warn('Push subscription failed (expected):', error);
      } else {
        console.error('Failed to subscribe:', error);
      }

      setErrorMessage(
        isBlocked ? notificationsBlockedText[locale] : notificationsIncognitoText[locale],
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      await unsubscribeFromPushNotifications();
      setIsSubscribed(false);
      return true; // Successfully unsubscribed
    } catch (error) {
      console.error('Unsubscribe failed', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleSubscription = useCallback(async (): Promise<boolean> => {
    if (isSubscribed) {
      await unsubscribeFromPush();
      return false; // Result is "not subscribed"
    } else {
      return await subscribeToPush(); // Result is "subscribed" (if true)
    }
  }, [isSubscribed, subscribeToPush, unsubscribeFromPush]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    errorMessage,
    toggleSubscription,
  };
}
