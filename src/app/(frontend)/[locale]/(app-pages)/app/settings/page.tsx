import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { MainMenuLanguageSwitcher } from '@/components/menu/main-menu-language-switcher';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { LogoutButton } from '@/features/settings/logout-button';
import { ProfileDetails } from '@/features/settings/profile-details';
import { PushNotificationSettings } from '@/features/settings/push-notification-settings';
import type { StaticTranslationString } from '@/types/types';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import React from 'react';

const settingsTitle: StaticTranslationString = {
  de: 'Einstellungen',
  en: 'Settings',
  fr: 'Paramètres',
};

const Settings: React.FC = async () => {
  const locale = await getLocaleFromCookies();

  return (
    <>
      {/* Set the dynamic page title based on the locale */}
      <SetDynamicPageTitle newTitle={settingsTitle[locale]} />

      {/* Main content section */}
      <section className="container mx-auto my-8 px-4 py-8 md:py-12">
        <article className="mx-auto w-full max-w-2xl space-y-10">
          <HeadlineH1>{settingsTitle[locale]}</HeadlineH1>
          <ProfileDetails />
          <LogoutButton />
        </article>

        {/* Add Option to Change Language */}
        <article className="mt-8 rounded-lg bg-white px-6 shadow-md">
          <MainMenuLanguageSwitcher locale={locale} />
        </article>

        {/* Add Option to Configure Push Notifications */}
        <article className="mt-8 rounded-lg bg-white p-6 px-6 shadow-md">
          <PushNotificationSettings />
        </article>
      </section>
    </>
  );
};

export default Settings;
