import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { SectionLabel } from '@/components/ui/section-label';
import { AboutSettings } from '@/features/settings/about-settings';
import { AnalyticsSettings } from '@/features/settings/analytics-settings';
import { SettingsCard } from '@/features/settings/components/settings-row';
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

      <div className="mx-auto w-full max-w-2xl space-y-6 px-4 pt-4 pb-12">
        {/* Profile and support */}
        <ProfileDetails />

        {/* App Preferences */}
        <section>
          <SectionLabel className="mb-2 px-1">{appPreferencesTitle[locale]}</SectionLabel>
          <SettingsCard>
            <PushNotificationSettings locale={locale} />
            <LanguageSettings locale={locale} />
            <OfflineContentSettings locale={locale} />
            {/* renders nothing on a deployment without PostHog */}
            <AnalyticsSettings locale={locale} />
          </SettingsCard>
        </section>

        {/* About */}
        <AboutSettings locale={locale} webBuild={build} />
      </div>
    </>
  );
};

export default Settings;
