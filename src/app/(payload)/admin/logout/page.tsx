'use client';

import { ConveniatLogo } from '@/components/svg-logos/conveniat-logo';
import { AdminPanelBackgroundFaker } from '@/features/payload-cms/payload-cms/components/login-page/admin-panel-background-faker';
import { Config } from '@/features/payload-cms/payload-types';
import { StaticTranslationString } from '@/types/types';
import { useLocale } from '@payloadcms/ui';
import { signOut } from 'next-auth/react';

const localizedLogoutText: StaticTranslationString = {
  en: 'Logging out...',
  de: 'Abmelden...',
  fr: 'Déconnexion...',
};

const Page = () => {
  const { code } = useLocale() as { code: Config['locale'] };

  signOut({
    redirect: true,
    redirectTo: '/',
  }).catch((e: unknown) => console.error(e));
  return (
    <>
      <AdminPanelBackgroundFaker />
      <div className="fixed top-0 left-0 flex h-screen w-screen flex-row justify-center">
        <div className="mt-2 flex flex-col justify-center text-center">
          <ConveniatLogo className="mx-auto mb-8 h-18 w-18" />
          <h1 className="text-conveniat-green mb-16 text-3xl font-extrabold">conveniat27</h1>
          <span className="text-conveniat-green">{localizedLogoutText[code]}</span>
        </div>
      </div>
    </>
  );
};

export default Page;
