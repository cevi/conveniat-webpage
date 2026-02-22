'use client';

import { CenteredConveniatLogo } from '@/features/onboarding/components/centered-conveniat-logo';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { handleLogin } from '@/utils/login-handler';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';

const loginText: StaticTranslationString = {
  en: 'This page requires authentication, please log in.',
  de: 'Diese Seite erfordert eine Authentifizierung, bitte melde dich an.',
  fr: 'Cette page nécessite une authentification, veuillez vous connecter.',
};

const loginButtonText: StaticTranslationString = {
  en: 'Login with Cevi.DB',
  de: 'Anmelden mit Cevi.DB',
  fr: 'Connexion avec Cevi.DB',
};

export const UnauthorizedPage = (): React.JSX.Element => {
  const currentLocale = useCurrentLocale(i18nConfig);
  const locale = (currentLocale ?? 'en') as Locale;

  return (
    <article className="mx-4 my-16 flex h-full items-center justify-center">
      <div className="flex flex-col rounded-lg p-8 text-center">
        <CenteredConveniatLogo />

        <p className="mt-6 mb-4 text-balance text-gray-700">{loginText[locale]}</p>
        <button
          onClick={() => handleLogin()}
          className="font-heading cursor-pointer rounded-[8px] bg-red-700 px-8 py-3 text-center text-lg leading-normal font-bold text-red-100 duration-100 hover:bg-red-800"
        >
          {loginButtonText[locale]}
        </button>
      </div>
    </article>
  );
};

export default UnauthorizedPage;
