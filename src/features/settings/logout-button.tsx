'use client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { Loader2 } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useState } from 'react';

const logoutText: StaticTranslationString = {
  de: 'Abmelden',
  en: 'Log out',
  fr: 'Déconnexion',
};

const loggingOutText: StaticTranslationString = {
  de: 'Abmelden...',
  en: 'Logging out...',
  fr: 'Déconnexion...',
};

export const LogoutButton: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const [isLoading, setIsLoading] = useState(false);

  return (
    <button
      onClick={() => {
        setIsLoading(true);
        signOut({
          redirect: true,
          redirectTo: '/',
        }).catch((error: unknown) => {
          console.error(error);
          setIsLoading(false);
        });
      }}
      disabled={isLoading}
      className="font-heading mt-10 w-full rounded-[8px] bg-red-700 px-8 py-3 text-center text-lg leading-normal font-bold text-red-100 duration-100 hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          {loggingOutText[locale]}
        </span>
      ) : (
        logoutText[locale]
      )}
    </button>
  );
};
