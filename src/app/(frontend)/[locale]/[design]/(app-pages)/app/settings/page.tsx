import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { SectionLabel } from '@/components/ui/section-label';
import { AnalyticsSettings } from '@/features/settings/analytics-settings';
import { SettingsCard } from '@/features/settings/components/settings-row';
import { HelpSettings } from '@/features/settings/help-settings';
import { LanguageSettings } from '@/features/settings/language-settings';
import { OfflineContentSettings } from '@/features/settings/offline-content-settings';
import { LogoutSection, ProfileDetails } from '@/features/settings/profile-details';
import { PushNotificationSettings } from '@/features/settings/push-notification-settings';
import { ReminderSettings } from '@/features/settings/reminder-settings';
import type { Locale, StaticTranslationString } from '@/types/types';
import { getBuildInfo } from '@/utils/get-build-info';
import React from 'react';

const settingsTitle: StaticTranslationString = {
  de: 'Einstellungen',
  en: 'Settings',
  fr: 'Paramètres',
};

const appTitle: StaticTranslationString = {
  de: 'App',
  en: 'App',
  fr: 'App',
};

const versionLabel: StaticTranslationString = {
  de: 'Version',
  en: 'Version',
  fr: 'Version',
};

/**
 * The settings: the profile and "Mein Lager", the app's own settings, help, logging out and the
 * version that runs.
 */
const Settings: React.FC<{ params: Promise<{ locale: Locale }> }> = async ({ params }) => {
  const { locale } = await params;
  const build = await getBuildInfo(locale);

  return (
    <>
      {/* Set the dynamic page title based on the locale */}
      <SetDynamicPageTitle newTitle={settingsTitle[locale]} />

      <div className="mx-auto w-full max-w-2xl space-y-6 px-4 pt-5 pb-12">
        <ProfileDetails />

        <section>
          <SectionLabel className="mb-2 px-1">{appTitle[locale]}</SectionLabel>
          <SettingsCard>
            <PushNotificationSettings locale={locale} />
            {/* renders nothing for a visitor who is not logged in */}
            <ReminderSettings locale={locale} />
            {/* renders nothing on a deployment without PostHog */}
            <AnalyticsSettings locale={locale} />
            <LanguageSettings locale={locale} />
            <OfflineContentSettings locale={locale} />
          </SettingsCard>
        </section>

        <HelpSettings locale={locale} webBuild={build} />

        <LogoutSection />

        {build !== undefined && (
          <p className="text-center text-xs text-green-700 tabular-nums">
            {versionLabel[locale]} {build.version} ({build.git.hash}) · {build.timestamp}
          </p>
        )}
      </div>
    </>
  );
};

export default Settings;
