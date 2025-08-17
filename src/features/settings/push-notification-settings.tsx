'use client';

// TODO: use a proper shared component for push notification settings
// eslint-disable-next-line import/no-restricted-paths
import { PushNotificationSubscriptionManager } from '@/features/onboarding/components/push-notification-subscription-manager';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import React from 'react';

const pushNotificationSettingsTitle: Record<Locale, string> = {
  de: 'Push-Benachrichtigungen',
  en: 'Push Notifications',
  fr: 'Notifications Push',
};

export const PushNotificationSettings: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  return (
    <div className="text-center">
      <h2 className="text-conveniat-green mb-8 text-left text-xl font-bold">
        {pushNotificationSettingsTitle[locale]}
      </h2>
      <PushNotificationSubscriptionManager callback={() => {}} locale={locale} />
    </div>
  );
};
