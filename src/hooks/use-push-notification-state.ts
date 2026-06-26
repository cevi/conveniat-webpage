'use client';

import { useServiceWorkerStatus } from '@/hooks/use-service-worker-status';
import type { Locale } from '@/types/types';
import {
  getPushSubscription,
  isPushSupported,
} from '@/utils/push-notifications/push-manager-utils';
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from '@/utils/push-notifications/push-subscription';
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

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  errorMessage: string | undefined;
}

/**
 * Parses a push subscription error to log correctly and return the user-facing message.
 */
function getSubscriptionErrorMessage(error: unknown, locale: Locale): string {
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

  return isBlocked ? notificationsBlockedText[locale] : notificationsIncognitoText[locale];
}

interface UsePushNotificationStateResult {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  errorMessage: string | undefined;
  toggleSubscription: () => Promise<boolean>;
}

export interface UsePushNotificationStateProperties {
  registrationSource?: '/entrypoint' | '/app/settings';
  locale: Locale;
}

export function usePushNotificationState(
  props: UsePushNotificationStateProperties,
): UsePushNotificationStateResult {
  const { registrationSource, locale } = props;
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: false,
    errorMessage: undefined,
  });

  const updateState = useCallback((updates: Partial<PushNotificationState>) => {
    setState((previousState) => ({ ...previousState, ...updates }));
  }, []);

  // Use shared hook to check SW readiness (2s timeout)
  const { isReady: swReady, error: swError } = useServiceWorkerStatus(2000);

  useEffect(() => {
    let mounted = true;

    const checkSubscription = async (): Promise<void> => {
      const supported = isPushSupported();
      if (!supported) {
        if (mounted) {
          updateState({
            isSupported: false,
            isSubscribed: false,
            isLoading: false,
            errorMessage: undefined,
          });
        }
        return;
      }

      let permissionErrorMessage: string | undefined;
      if (Notification.permission === 'denied') {
        permissionErrorMessage = notificationsBlockedText[locale];
      }

      // If SW failed or timed out, we assume failure (silent check)
      if (swError) {
        console.warn('SW check failed or timed out:', swError);
        if (mounted) {
          updateState({
            isSupported: true,
            isSubscribed: false,
            isLoading: false,
            errorMessage: permissionErrorMessage,
          });
        }
        return;
      }

      if (!swReady) return;

      try {
        const sub = await getPushSubscription();
        if (mounted) {
          updateState({
            isSupported: true,
            isSubscribed: !!sub,
            isLoading: false,
            errorMessage: permissionErrorMessage,
          });
        }
      } catch (error) {
        console.warn('Failed to check push subscription:', error);
        if (mounted) {
          updateState({
            isSupported: true,
            isSubscribed: false,
            isLoading: false,
            errorMessage: permissionErrorMessage,
          });
        }
      }
    };

    void checkSubscription();

    return (): void => {
      mounted = false;
    };
  }, [locale, swReady, swError, updateState]);

  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    updateState({ isLoading: true, errorMessage: undefined });
    try {
      await subscribeToPushNotifications(locale, registrationSource);
      updateState({ isLoading: false, isSubscribed: true });
      return true;
    } catch (error: unknown) {
      const subscriptionErrorMessage = getSubscriptionErrorMessage(error, locale);
      updateState({ isLoading: false, errorMessage: subscriptionErrorMessage });
      return false;
    }
  }, [locale, registrationSource, updateState]);

  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    updateState({ isLoading: true, isSubscribed: false }); // Optimistic update
    try {
      await unsubscribeFromPushNotifications();
      updateState({ isLoading: false });
      return true; // Successfully unsubscribed
    } catch (error) {
      console.error('Unsubscribe failed', error);
      updateState({ isLoading: false, isSubscribed: true }); // Revert on failure
      return false;
    }
  }, [updateState]);

  const toggleSubscription = useCallback(async (): Promise<boolean> => {
    if (state.isSubscribed) {
      await unsubscribeFromPush();
      return false; // Result is "not subscribed"
    } else {
      return await subscribeToPush(); // Result is "subscribed" (if true)
    }
  }, [state.isSubscribed, subscribeToPush, unsubscribeFromPush]);

  return {
    isSupported: state.isSupported,
    isSubscribed: state.isSubscribed,
    isLoading: state.isLoading,
    errorMessage: state.errorMessage,
    toggleSubscription,
  };
}
