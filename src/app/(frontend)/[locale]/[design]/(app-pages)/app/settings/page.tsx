import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { Card } from '@/components/ui/card';
import { LanguageSettings } from '@/features/settings/language-settings';
import { OfflineContentSettings } from '@/features/settings/offline-content-settings';
import { ProfileDetails } from '@/features/settings/profile-details';
import { PushNotificationSettings } from '@/features/settings/push-notification-settings';
import type { Locale, StaticTranslationString } from '@/types/types';
import React from 'react';

const settingsTitle: StaticTranslationString = {
  de: 'Einstellungen',
  en: 'Settings',
  fr: 'Paramètres',
};

const appPreferencesTitle: StaticTranslationString = {
  de: 'App-Einstellungen',
  en: 'App Preferences',
  fr: "Préférences de l'application",
};

const Settings: React.FC<{ params: Promise<{ locale: Locale }> }> = async ({ params }) => {
  const { locale } = await params;

  return (
    <>
      {/* Set the dynamic page title based on the locale */}
      <SetDynamicPageTitle newTitle={settingsTitle[locale]} />

      {/* Main content section */}
      <section className="container mx-auto my-6 py-6">
        <div className="mx-auto w-full max-w-2xl space-y-6 px-4">
          {/* Profile Section */}
          <ProfileDetails />

          {/* App Preferences Section */}
          <Card title={appPreferencesTitle[locale]} divided>
            {/* Push Notifications Row */}
            <div className="px-6 py-4">
              <PushNotificationSettings locale={locale} />
            </div>

            {/* Language Row */}
            <div className="px-6 py-4">
              <LanguageSettings locale={locale} />
            </div>

            {/* Offline Content Row */}
            <div className="px-6 py-4">
              <OfflineContentSettings locale={locale} />
            </div>
          </Card>
        </div>
      </section>
    </>
  );
};

export default Settings;
