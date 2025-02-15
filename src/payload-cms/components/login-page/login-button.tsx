'use client';
import React from 'react';
import { signIn } from 'next-auth/react';
import { useLocale } from '@payloadcms/ui';
import { Config } from '@/payload-types';
import { AdminPanelBackgroundFaker } from '@/payload-cms/components/login-page/admin-panel-background-faker';
import { StaticTranslationString } from '@/types';

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
const LoginButton: React.FC = () => {
  const { code } = useLocale() as { code: Config['locale'] };

  return (
    <>
      <AdminPanelBackgroundFaker />

      {/* login button */}
      <div>
        <div className="mt-2 flex justify-center">
          <h1 className="mb-16 text-3xl font-extrabold text-conveniat-green">conveniat27</h1>
        </div>
        <div className="flex justify-center">
          <button
            className="rounded border-2 border-solid border-green-600 bg-green-100 px-4 py-2 font-bold text-conveniat-green outline-none"
            onClick={handleLoginClick}
          >
            {localizedLoginText[code]}
          </button>
        </div>
      </div>
    </>
  );
};

export default LoginButton;
