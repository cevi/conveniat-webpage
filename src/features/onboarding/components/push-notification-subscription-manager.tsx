'use client';

import { NativePushSubscriptionManager } from '@/features/onboarding/components/native-push-subscription-manager';
import { PushNotificationActions } from '@/features/onboarding/components/push-notification-actions';
import { PushNotificationNotSupported } from '@/features/onboarding/components/push-notification-not-supported';
import { usePushNotificationState } from '@/hooks/use-push-notification-state';
import { isNativeAppWebView } from '@/utils/standalone-check';

import React, { useEffect, useState } from 'react';

/**
 * PushNotificationManager is a React component that manages push notifications.
 * Routes to native push handling when running inside the KonektaApp WebView,
 * and falls back to Web Push for browser-based installs.
 */
export const PushNotificationSubscriptionManager: React.FC<{
  callback: () => void;
  locale: 'de' | 'fr' | 'en';
}> = ({ callback, locale }) => {
  const [isNative, setIsNative] = useState<boolean | null>(null);

  useEffect(() => {
    setIsNative(isNativeAppWebView());
  }, []);

  // Always call the web push hook so hook call order is stable across renders.
  // The result is intentionally unused in native mode.
  const { isSupported, isSubscribed, isLoading, errorMessage, toggleSubscription } =
    usePushNotificationState({ registrationSource: '/entrypoint', locale });

  if (isNative === null) return null;

  if (isNative) {
    return <NativePushSubscriptionManager callback={callback} locale={locale} />;
  }

  if (!isSupported) {
    return <PushNotificationNotSupported locale={locale} onSkip={callback} />;
  }

  return (
    <PushNotificationActions
      locale={locale}
      isSubscribed={isSubscribed}
      isLoading={isLoading}
      errorMessage={errorMessage}
      onToggle={toggleSubscription}
      onContinue={callback}
    />
  );
};
