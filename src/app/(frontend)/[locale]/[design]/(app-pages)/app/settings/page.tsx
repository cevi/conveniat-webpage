import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { Card } from '@/components/ui/card';
import { AboutSettings } from '@/features/settings/about-settings';
import { LanguageSettings } from '@/features/settings/language-settings';
import { OfflineContentSettings } from '@/features/settings/offline-content-settings';
import { ProfileDetails } from '@/features/settings/profile-details';
import { PushNotificationSettings } from '@/features/settings/push-notification-settings';
import type { Locale, StaticTranslationString } from '@/types/types';
import { getBuildInfo } from '@/utils/get-build-info';
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
  const build = await getBuildInfo(locale);

  return (
    <>
      {/* Set the dynamic page title based on the locale */}
      <SetDynamicPageTitle newTitle={settingsTitle[locale]} />

      {/* Main content section */}
      <section className="container mx-auto mt-6 mb-6 pt-6 pb-12">
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

          {/* About Section */}
          <AboutSettings locale={locale} webBuild={build} />
        </div>
      </section>
    </>
  );
};

export default Settings;
