'use client';

import { Switch } from '@/components/ui/switch';
import { SettingsRow } from '@/features/settings/components/settings-row';
import { useNativePush } from '@/hooks/use-native-push';
import { usePushNotificationState } from '@/hooks/use-push-notification-state';

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
  const {
    isSupported: isWebSupported,
    isSubscribed: isWebSubscribed,
    isLoading: isWebLoading,
    errorMessage: webError,
    toggleSubscription,
  } = usePushNotificationState({ registrationSource: '/app/settings' });

  const { isNativeApp, status, hasToken, requestPermission, deleteToken, openSettings } =
    useNativePush();

  const isNativeSupported = true; // WebView bridge handles support
  const isNativeSubscribed = hasToken && status === 'granted';
  const isNativeLoading = status === 'unknown';

  const isSupported = isNativeApp ? isNativeSupported : isWebSupported;
  const isSubscribed = isNativeApp ? isNativeSubscribed : isWebSubscribed;
  const isLoading = isNativeApp ? isNativeLoading : isWebLoading;
  const errorMessage = isNativeApp ? undefined : webError;

  const handleToggle = (): void => {
    if (isNativeApp) {
      if (isNativeSubscribed) {
        deleteToken();
      } else {
        if (status === 'denied') {
          openSettings();
        } else {
          requestPermission();
        }
      }
    } else {
      toggleSubscription().catch(console.error);
    }
  };

  return (
    <SettingsRow
      icon={Bell}
      title={pushNotificationSettingsTitle[locale]}
      subtitle={isSupported ? pushNotificationDescription[locale] : notSupportedText[locale]}
      error={errorMessage}
      action={
        <Switch
          checked={isSubscribed}
          onCheckedChange={handleToggle}
          disabled={!isSupported || isLoading || !!errorMessage}
          loading={isLoading}
        />
      }
    />
  );
};
