'use client';
import { Button } from '@/components/ui/buttons/button';
import { AdminPanelBackgroundFaker } from '@/features/payload-cms/payload-cms/components/login-page/admin-panel-background-faker';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { signIn } from 'next-auth/react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React from 'react';

/**
 * Redirect to the CeviDB login page (using NextAuth).
 */
const handleLoginClick = (): void => {
  signIn('cevi-db').catch((error: unknown) => {
    console.error('Login error', error);
  });
};

const localizedLoginText: StaticTranslationString = {
  en: 'Login with CeviDB',
  de: 'Mit CeviDB anmelden',
  fr: 'Se connecter avec CeviDB',
};

/**
 * This component is used as the login button on the admin panel of the Payload CMS.
 * It redirects the user to the CeviDB login page and styles the background with the Cevi logo
 * identical to the frontend, to create a seamless transition between the two.
 *
 * @constructor
 */
const AdminPanelLoginPage: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  return (
    <>
      <AdminPanelBackgroundFaker />

      {/* login button */}
      <div>
        <div className="mt-2 flex justify-center">
          <h1 className="text-conveniat-green mb-16 text-3xl font-extrabold">
            conveniat27 | Admin
          </h1>
        </div>
        <div className="flex justify-center">
          <Button
            onClick={handleLoginClick}
            className="font-heading cursor-pointer rounded-[8px] border-none bg-red-700 px-8 py-3 text-center text-lg leading-normal font-bold text-red-100 duration-100 hover:bg-red-800"
          >
            {localizedLoginText[locale]}
          </Button>
        </div>
      </div>
    </>
  );
};

export default AdminPanelLoginPage;
