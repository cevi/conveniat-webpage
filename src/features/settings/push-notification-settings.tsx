'use client';

import { PushNotificationManagerEntrypointComponent } from '@/features/onboarding/components/push-notification-manager';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import React from 'react';

export const PushNotificationSettings: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  return (
    <>
      <h2 className="mb-4 text-xl font-semibold">Push Notifications</h2>
      <p className="text-gray-600">Configure your push notification settings here.</p>
      <PushNotificationManagerEntrypointComponent callback={() => {}} locale={locale} />
    </>
  );
};
