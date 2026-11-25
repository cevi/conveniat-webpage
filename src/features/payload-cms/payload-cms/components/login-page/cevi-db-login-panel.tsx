'use client';
import { LinkComponent } from '@/components/ui/link-component';
import { CenteredConveniatLogo } from '@/features/onboarding/components/centered-conveniat-logo';
import { AdminPanelBackgroundFaker } from '@/features/payload-cms/payload-cms/components/login-page/admin-panel-background-faker';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { LogIn } from 'lucide-react';
import { signIn } from 'next-auth/react';
import React from 'react';

const loginButtonText: StaticTranslationString = {
  en: 'Login with Cevi.DB',
  de: 'Anmelden mit Cevi.DB',
  fr: 'Connexion avec Cevi.DB',
};

const loginFailedText: StaticTranslationString = {
  en: 'Signing in with Cevi.DB did not work. Please try again.',
  de: 'Die Anmeldung mit Cevi.DB hat nicht geklappt. Versuch es bitte noch einmal.',
  fr: 'La connexion avec Cevi.DB n’a pas abouti. Réessaie s’il te plaît.',
};

const helpLinkText: StaticTranslationString = {
  en: 'What is Cevi.DB?',
  de: 'Was ist Cevi.DB?',
  fr: 'Qu’est-ce que Cevi.DB ?',
};

interface CeviDatabaseLoginPanelProperties {
  /** The page the login returns to; without one it ends in the admin panel. */
  returnPath: string | undefined;
  /** Whether the login leads into the admin panel, and not back to a page of the site. */
  isAdminPanelLogin: boolean;
  /** Whether the person arrives here from a login that failed. */
  hasFailed: boolean;
}

/**
 * The Cevi.DB login button on the login view of the Payload admin panel. The background is
 * styled identical to the frontend, to create a seamless transition between the two.
 */
export const CeviDatabaseLoginPanel: React.FC<CeviDatabaseLoginPanelProperties> = ({
  returnPath,
  isAdminPanelLogin,
  hasFailed,
}) => {
  const locale = (useCurrentLocale(i18nConfig) ?? 'de') as Locale;

  const handleLoginClick = (): void => {
    signIn('cevi-db', returnPath === undefined ? undefined : { callbackUrl: returnPath }).catch(
      (error: unknown) => {
        console.error('Login error', error);
      },
    );
  };

  return (
    <article className="mx-4 flex min-h-[calc(100dvh-200px)] items-center justify-center py-16">
      <AdminPanelBackgroundFaker hideLogo />

      <div className="flex w-full max-w-md flex-col items-center text-center">
        <CenteredConveniatLogo />

        {isAdminPanelLogin && (
          <h1 className="text-conveniat-green mt-2 text-xl font-bold">Admin Panel</h1>
        )}

        {hasFailed && (
          <p role="alert" className="mt-6 max-w-sm text-base font-medium text-red-800">
            {loginFailedText[locale]}
          </p>
        )}

        <button
          onClick={handleLoginClick}
          className="font-heading mt-12 flex cursor-pointer items-center gap-3 rounded-[12px] border-none bg-red-800 px-10 py-4 text-center text-xl font-bold text-red-50 shadow-none transition-all duration-200 hover:scale-[1.02] hover:bg-red-900 active:scale-[0.98]"
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
