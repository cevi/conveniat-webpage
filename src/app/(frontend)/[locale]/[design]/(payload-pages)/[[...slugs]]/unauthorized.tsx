'use client';

import { CenteredConveniatLogo } from '@/features/onboarding/components/centered-conveniat-logo';
import { SetHideHeader } from '@/components/header/hide-header-context';
import { SetHideBackgroundLogo } from '@/components/ui/hide-background-logo-context';
import { LinkComponent } from '@/components/ui/link-component';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { handleLogin } from '@/utils/login-handler';
import { LogIn } from 'lucide-react';
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

const helpLinkText: StaticTranslationString = {
  en: 'What is Cevi.DB?',
  de: 'Was ist Cevi.DB?',
  fr: 'Qu’est-ce que Cevi.DB ?',
};

export const UnauthorizedPage = (): React.JSX.Element => {
  const currentLocale = useCurrentLocale(i18nConfig);
  const locale = (currentLocale ?? 'en') as Locale;

  return (
    <article className="mx-4 flex min-h-[calc(100dvh-300px)] items-center justify-center py-16">
      <SetHideHeader value />
      <SetHideBackgroundLogo value />

      <div className="flex w-full max-w-md flex-col items-center text-center">
        <CenteredConveniatLogo />

        <p className="mt-2 mb-8 text-balance text-lg text-gray-600">{loginText[locale]}</p>

        <button
          onClick={() => handleLogin()}
          className="font-heading flex cursor-pointer items-center gap-3 rounded-[12px] bg-red-800 px-10 py-4 text-center text-xl font-bold text-red-50 transition-all duration-200 hover:scale-[1.02] hover:bg-red-900 active:scale-[0.98]"
        >
          <LogIn className="size-6" />
          {loginButtonText[locale]}
        </button>

        <div className="mt-8">
          <LinkComponent
            href="https://wiki.cevi.ch/index.php/Cevi.DB"
            openInNewTab
            className="text-sm font-medium text-gray-500 underline-offset-4 hover:text-gray-800 hover:underline"
          >
            {helpLinkText[locale]}
          </LinkComponent>
        </div>
      </div>
    </article>
  );
};

export default UnauthorizedPage;
