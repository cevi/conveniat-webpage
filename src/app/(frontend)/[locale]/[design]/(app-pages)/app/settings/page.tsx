import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { MainMenuLanguageSwitcher } from '@/components/menu/main-menu-language-switcher';
import { ProfileDetails } from '@/features/settings/profile-details';
import { PushNotificationSettings } from '@/features/settings/push-notification-settings';
import type { Locale, StaticTranslationString } from '@/types/types';
import React from 'react';

const settingsTitle: StaticTranslationString = {
  de: 'Einstellungen',
  en: 'Settings',
  fr: 'Paramètres',
};

const Settings: React.FC<{ params: Promise<{ locale: Locale }> }> = async ({ params }) => {
  const { locale } = await params;

  return (
    <>
      {/* Set the dynamic page title based on the locale */}
      <SetDynamicPageTitle newTitle={settingsTitle[locale]} />

      {/* Main content section */}
      <section className="container mx-auto mt-8 py-6">
        <div className="mx-auto w-full max-w-2xl space-y-6 px-8">
          <article className="mx-auto w-full max-w-2xl space-y-10">
            <ProfileDetails />
          </article>

          {/* Add Option to Change Language */}
          <article className="my-8 rounded-lg border-2 border-gray-200 bg-white px-6 md:p-8">
            <MainMenuLanguageSwitcher locale={locale} />
          </article>

          {/* Add Option to Configure Push Notifications */}
          <article className="rounded-lg border-2 border-gray-200 bg-white p-6">
            <PushNotificationSettings />
          </article>
        </div>
      </section>
    </>
  );
};

export default Settings;
