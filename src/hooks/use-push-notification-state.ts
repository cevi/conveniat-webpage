'use client';

import { useServiceWorkerStatus } from '@/hooks/use-service-worker-status';
import { writePreference } from '@/lib/preferences';
import type { Locale, StaticTranslationString } from '@/types/types';
import {
  getPushSubscription,
  isPushSupported,
} from '@/utils/push-notifications/push-manager-utils';
import {
  PushSubscribeError,
  type PushSubscribeFailureReason,
} from '@/utils/push-notifications/push-subscribe-error';
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from '@/utils/push-notifications/push-subscription';
import { useCallback, useEffect, useState } from 'react';

const notificationsBlockedText: StaticTranslationString = {
  en: 'Notifications blocked. Please enable them in your browser settings.',
  de: 'Benachrichtigungen blockiert. Bitte in den Browsereinstellungen aktivieren.',
  fr: 'Notifications bloquées. Veuillez les activer dans les paramètres du navigateur.',
};

const failureTexts: Record<
  Exclude<PushSubscribeFailureReason, 'blocked'> | 'offline' | 'unknown',
  StaticTranslationString
> = {
  dismissed: {
    en: 'Notifications were not allowed. Tap again to allow them.',
    de: 'Benachrichtigungen wurden nicht erlaubt. Tippe nochmals, um sie zu erlauben.',
    fr: "Les notifications n'ont pas été autorisées. Appuyez à nouveau pour les autoriser.",
  },
  offline: {
    en: 'No connection. Try again once you are online.',
    de: 'Keine Verbindung. Versuche es nochmals, sobald du online bist.',
    fr: 'Pas de connexion. Réessayez une fois en ligne.',
  },
  'not-ready': {
    en: 'The app is not ready yet. Reload the page and try again.',
    de: 'Die App ist noch nicht bereit. Lade die Seite neu und versuche es nochmals.',
    fr: "L'application n'est pas encore prête. Rechargez la page et réessayez.",
  },
  'push-service': {
    en: 'Your browser could not set up notifications. This often fails in a private window.',
    de: 'Dein Browser konnte Benachrichtigungen nicht einrichten. In einem privaten Fenster geht das oft nicht.',
    fr: "Votre navigateur n'a pas pu activer les notifications. C'est souvent impossible dans une fenêtre privée.",
  },
  server: {
    en: 'Notifications could not be saved. Please try again.',
    de: 'Benachrichtigungen konnten nicht gespeichert werden. Versuche es nochmals.',
    fr: "Les notifications n'ont pas pu être enregistrées. Veuillez réessayer.",
  },
  unknown: {
    en: 'Notifications could not be enabled. Please try again.',
    de: 'Benachrichtigungen konnten nicht aktiviert werden. Versuche es nochmals.',
    fr: "Les notifications n'ont pas pu être activées. Veuillez réessayer.",
  },
};

interface PushNotificationState {
  /** whether the browser's support and subscription were read; before, nothing is known */
  isChecked: boolean;
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  errorMessage: string | undefined;
  /** the permission is denied, so asking again cannot help; any other error can be retried */
  isBlocked: boolean;
}

/**
 * Logs a failed subscription and returns what the user reads. The reason comes from
 * {@link PushSubscribeError}; a failure while offline says so whatever step it hit.
 */
function describeSubscriptionError(
  error: unknown,
  locale: Locale,
): { message: string; isBlocked: boolean } {
  const reason = error instanceof PushSubscribeError ? error.reason : undefined;
  const isPermission = reason === 'blocked' || reason === 'dismissed';
  const isOffline = !isPermission && typeof navigator !== 'undefined' && !navigator.onLine;

  if (isPermission || isOffline) {
    console.warn('Push subscription failed (expected):', error);
  } else {
    console.error('Failed to subscribe:', error);
  }

  if (reason === 'blocked') return { message: notificationsBlockedText[locale], isBlocked: true };
  const text = isOffline ? failureTexts.offline : failureTexts[reason ?? 'unknown'];
  return { message: text[locale], isBlocked: false };
}

interface UsePushNotificationStateResult {
  isChecked: boolean;
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  errorMessage: string | undefined;
  /** whether the error is a denied permission, the one failure a retry cannot fix */
  isBlocked: boolean;
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
    isChecked: false,
    isSupported: false,
    isSubscribed: false,
    isLoading: false,
    errorMessage: undefined,
    isBlocked: false,
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
            isChecked: true,
            isSupported: false,
            isSubscribed: false,
            isLoading: false,
            errorMessage: undefined,
            isBlocked: false,
          });
        }
        return;
      }

      let permissionErrorMessage: string | undefined;
      const isBlocked = Notification.permission === 'denied';
      if (isBlocked) {
        permissionErrorMessage = notificationsBlockedText[locale];
      }

      // If SW failed or timed out, we assume failure (silent check)
      if (swError) {
        if (mounted) {
          updateState({
            isChecked: true,
            isSupported: true,
            isSubscribed: false,
            isLoading: false,
            errorMessage: permissionErrorMessage,
            isBlocked,
          });
        }
        return;
      }

      if (!swReady) return;

      try {
        const sub = await getPushSubscription();
        if (mounted) {
          updateState({
            isChecked: true,
            isSupported: true,
            isSubscribed: !!sub,
            isLoading: false,
            errorMessage: permissionErrorMessage,
            isBlocked,
          });
        }
      } catch (error) {
        console.warn('Failed to check push subscription:', error);
        if (mounted) {
          updateState({
            isChecked: true,
            isSupported: true,
            isSubscribed: false,
            isLoading: false,
            errorMessage: permissionErrorMessage,
            isBlocked,
          });
        }
      }
    };

    void checkSubscription();

    const handleFocus = (): void => {
      void checkSubscription();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return (): void => {
      mounted = false;
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [locale, swReady, swError, updateState]);

  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    updateState({
      isLoading: true,
      isSubscribed: true,
      errorMessage: undefined,
      isBlocked: false,
    });
    writePreference('web-push-opted-out', false);
    try {
      await subscribeToPushNotifications(locale, registrationSource);
      updateState({ isLoading: false, isSubscribed: true });
      return true;
    } catch (error: unknown) {
      const { message, isBlocked } = describeSubscriptionError(error, locale);
      updateState({ isLoading: false, isSubscribed: false, errorMessage: message, isBlocked });
      return false;
    }
  }, [locale, registrationSource, updateState]);

  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    updateState({ isLoading: true, isSubscribed: false }); // Optimistic update
    // Recorded before the unsubscribe: if it fails halfway, the start-up restore must not
    // subscribe the browser again against the user's choice.
    writePreference('web-push-opted-out', true);
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
    isChecked: state.isChecked,
    isSupported: state.isSupported,
    isSubscribed: state.isSubscribed,
    isLoading: state.isLoading,
    errorMessage: state.errorMessage,
    isBlocked: state.isBlocked,
    toggleSubscription,
  };
}
