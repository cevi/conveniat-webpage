'use client';
import { CenteredConveniatLogo } from '@/features/onboarding/components/centered-conveniat-logo';
import { AdminPanelBackgroundFaker } from '@/features/payload-cms/payload-cms/components/login-page/admin-panel-background-faker';
import { LinkComponent } from '@/components/ui/link-component';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { LogIn } from 'lucide-react';
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

/**
 * This component is used as the login button on the admin panel of the Payload CMS.
 * It redirects the user to the CeviDB login page and styles the background
 * identical to the frontend, to create a seamless transition between the two.
 */
const AdminPanelLoginPage: React.FC = () => {
  const locale = (useCurrentLocale(i18nConfig) ?? 'de') as Locale;

  return (
    <article className="mx-4 flex min-h-[calc(100dvh-200px)] items-center justify-center py-16">
      <AdminPanelBackgroundFaker hideLogo />

      <div className="flex w-full max-w-md flex-col items-center text-center">
        <CenteredConveniatLogo />

        <h1 className="text-conveniat-green mt-2 mb-12 text-xl font-bold">Admin Panel</h1>

        <button
          onClick={handleLoginClick}
          className="font-heading flex cursor-pointer items-center gap-3 rounded-[12px] border-none bg-red-800 px-10 py-4 text-center text-xl font-bold text-red-50 shadow-none transition-all duration-200 hover:scale-[1.02] hover:bg-red-900 active:scale-[0.98]"
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

export default AdminPanelLoginPage;
