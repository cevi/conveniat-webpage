import { SectionLabel } from '@/components/ui/section-label';
import { SettingsCard } from '@/features/settings/components/settings-row';
import { ProfileSkeleton } from '@/features/settings/components/settings-skeleton';
import { HelpSettings } from '@/features/settings/help-settings';
import { LanguageSettings } from '@/features/settings/language-settings';
import { OfflineContentSettings } from '@/features/settings/offline-content-settings';
import { LogoutSection, ProfileDetails } from '@/features/settings/profile-details';
import { PushNotificationSettings } from '@/features/settings/push-notification-settings';
import { ReminderSettings } from '@/features/settings/reminder-settings';
import type { Locale, StaticTranslationString } from '@/types/types';
import { getBuildInfo } from '@/utils/get-build-info';
import type React from 'react';
import { Suspense } from 'react';

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
 *
 * Only the profile, "Abmelden" and the user's id in the support mail read the session, so only
 * they wait for the request, each behind its own Suspense boundary. Everything else is part of
 * the static shell and paints at once, with the skeleton of the profile above it.
 */
const Settings: React.FC<{ params: Promise<{ locale: Locale }> }> = async ({ params }) => {
  const { locale } = await params;
  const build = await getBuildInfo(locale);

  return (
    <>
      <div className="mx-auto w-full max-w-2xl space-y-6 px-4 pt-5 pb-12">
        <Suspense fallback={<ProfileSkeleton />}>
          <ProfileDetails />
        </Suspense>

        <section>
          <SectionLabel className="mb-2 px-1">{appTitle[locale]}</SectionLabel>
          <SettingsCard>
            <PushNotificationSettings locale={locale} />
            {/* renders nothing for a visitor who is not logged in */}
            <ReminderSettings locale={locale} />
            <LanguageSettings locale={locale} />
            <OfflineContentSettings locale={locale} />
          </SettingsCard>
        </section>

        <HelpSettings locale={locale} webBuild={build} />

        <Suspense>
          <LogoutSection />
        </Suspense>

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
