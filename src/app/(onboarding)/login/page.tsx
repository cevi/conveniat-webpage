'use client';
import { CenteredConveniatLogo } from '@/features/onboarding/components/centered-conveniat-logo';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import type { StaticTranslationString } from '@/types/types';
import { i18nConfig, type Locale } from '@/types/types';
import { handleLogin } from '@/utils/login-handler';
import { useSearchParams } from 'next/navigation';
import React, { Suspense } from 'react';

const loginText: StaticTranslationString = {
  en: 'Some app functionality require authentication, please log in.',
  de: 'Einige Funktionen der App erfordern eine Authentifizierung, bitte melde dich an.',
  fr: "Certaines fonctionnalités de l'application nécessitent une authentification, veuillez vous connecter.",
};

/** For a visitor sent here by a link that needs a login, like a file in a chat or a form. */
const protectedContentText: StaticTranslationString = {
  en: 'You need to log in to see this content.',
  de: 'Für diesen Inhalt musst du angemeldet sein.',
  fr: 'Tu dois être connecté pour voir ce contenu.',
};

const loginButtonText: StaticTranslationString = {
  en: 'Login with Cevi.DB',
  de: 'Anmelden mit Cevi.DB',
  fr: 'Connexion avec Cevi.DB',
};

/**
 * Where a link that needed a login, like a protected file under `/api`, wants to return to. It is
 * read only when the button is pressed and goes to Auth.js unchanged, which follows it only on our
 * own origin.
 */
const readCallbackUrl = (): string | undefined =>
  new URLSearchParams(globalThis.location.search).get('callbackUrl') ?? undefined;

/**
 * Says why the visitor has to log in. Search params are read below a Suspense boundary, so the
 * prerendered shell keeps the general text and the page needs no request to render offline.
 */
const LoginReason: React.FC<{ locale: Locale }> = ({ locale }) => {
  const fromProtectedContent = useSearchParams().has('callbackUrl');
  return (fromProtectedContent ? protectedContentText : loginText)[locale];
};

const LoginScreen: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  return (
    <article className="mx-4 flex h-full items-center justify-center">
      <div className="flex flex-col rounded-lg p-8 text-center">
        <CenteredConveniatLogo />

        <p className="mb-4 text-balance text-gray-700">
          <Suspense fallback={loginText[locale]}>
            <LoginReason locale={locale} />
          </Suspense>
        </p>
        <button
          onClick={() => handleLogin(readCallbackUrl())}
          className="font-heading cursor-pointer rounded-[8px] bg-red-700 px-8 py-3 text-center text-lg leading-normal font-bold text-red-100 duration-100 hover:bg-red-800"
        >
          {loginButtonText[locale]}
        </button>
      </div>
    </article>
  );
};

export default LoginScreen;
