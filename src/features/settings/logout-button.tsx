'use client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { signOut } from 'next-auth/react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React from 'react';

const logoutText: StaticTranslationString = {
  de: 'Abmelden...',
  en: 'Logging out...',
  fr: 'Déconnexion...',
};

export const LogoutButton: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  return (
    <div className="flex flex-col items-end">
      <button
        onClick={() => {
          signOut({
            redirect: true,
            redirectTo: '/',
          }).catch((error: unknown) => console.error(error));
        }}
        className="mt-4 inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none"
      >
        {logoutText[locale]}
      </button>
    </div>
  );
};
