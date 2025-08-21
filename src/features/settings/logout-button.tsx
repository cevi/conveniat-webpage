'use client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { signOut } from 'next-auth/react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React from 'react';

const logoutText: StaticTranslationString = {
  de: 'Abmelden',
  en: 'Logging out',
  fr: 'Déconnexion',
};

export const LogoutButton: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  return (
    <button
      onClick={() => {
        signOut({
          redirect: true,
          redirectTo: '/',
        }).catch((error: unknown) => console.error(error));
      }}
      className="font-heading mt-10 w-full rounded-[8px] bg-red-700 px-8 py-3 text-center text-lg leading-normal font-bold text-red-100 duration-100 hover:bg-red-800"
    >
      {logoutText[locale]}
    </button>
  );
};
