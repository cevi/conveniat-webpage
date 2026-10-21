import { PushNotificationSubscriptionManager } from '@/features/onboarding/components/push-notification-subscription-manager';
import { type StaticTranslationString } from '@/types/types';
import React from 'react';

export const skipPushNotificationText: StaticTranslationString = {
  en: 'Not now',
  de: 'Nicht jetzt',
  fr: 'Pas maintenant',
};

export const PushNotificationManagerEntrypointComponent: React.FC<{
  callback: () => void;
  locale: 'de' | 'fr' | 'en';
}> = ({ callback, locale }) => {
  return <PushNotificationSubscriptionManager callback={callback} locale={locale} />;
};
