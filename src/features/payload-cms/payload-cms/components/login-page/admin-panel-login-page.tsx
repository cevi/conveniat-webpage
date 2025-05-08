'use client';
import { Button } from '@/components/ui/buttons/button';
import { AdminPanelBackgroundFaker } from '@/features/payload-cms/payload-cms/components/login-page/admin-panel-background-faker';
import type { Config } from '@/features/payload-cms/payload-types';
import type { StaticTranslationString } from '@/types/types';
import { useLocale } from '@payloadcms/ui';
import { signIn } from 'next-auth/react';
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
          <Button variant="secondary" onClick={handleLoginClick}>
            {localizedLoginText[code]}
          </Button>
        </div>
      </div>
    </>
  );
};

export default AdminPanelLoginPage;
