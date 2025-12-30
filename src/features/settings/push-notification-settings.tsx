'use client';

import { Switch } from '@/components/ui/switch';
import { SettingsRow } from '@/features/settings/components/settings-row';
import { usePushNotificationState } from '@/features/settings/hooks/use-push-notification-state';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Bell } from 'lucide-react';
import React from 'react';

const pushNotificationSettingsTitle: StaticTranslationString = {
  de: 'Push-Benachrichtigungen',
  en: 'Push Notifications',
  fr: 'Notifications Push',
};

const pushNotificationDescription: StaticTranslationString = {
  de: 'Erhalte wichtige Updates',
  en: 'Get important updates',
  fr: 'Recevez des mises à jour importantes',
};

const notSupportedText: StaticTranslationString = {
  de: 'Nicht unterstützt',
  en: 'Not supported',
  fr: 'Non supporté',
};

export const PushNotificationSettings: React.FC<{ locale: Locale }> = ({ locale }) => {
  const { isSupported, isSubscribed, isLoading, errorMessage, toggleSubscription } =
    usePushNotificationState();

  return (
    <SettingsRow
      icon={Bell}
      title={pushNotificationSettingsTitle[locale]}
      subtitle={isSupported ? pushNotificationDescription[locale] : notSupportedText[locale]}
      error={errorMessage}
      action={
        <Switch
          checked={isSubscribed}
          onCheckedChange={toggleSubscription}
          disabled={!isSupported || isLoading}
          loading={isLoading}
        />
      }
    />
  );
};
