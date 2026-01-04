import { PushNotificationActions } from '@/features/onboarding/components/push-notification-actions';
import { PushNotificationNotSupported } from '@/features/onboarding/components/push-notification-not-supported';
import { usePushNotificationState } from '@/hooks/use-push-notification-state';

import React from 'react';

/**
 * PushNotificationManager is a React component that manages push notifications.
 * @constructor
 */
export const PushNotificationSubscriptionManager: React.FC<{
  callback: () => void;
  locale: 'de' | 'fr' | 'en';
}> = ({ callback, locale }) => {
  const { isSupported, isSubscribed, isLoading, errorMessage, toggleSubscription } =
    usePushNotificationState();

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
