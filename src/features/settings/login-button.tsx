'use client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { signIn } from 'next-auth/react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React from 'react';

const loginText: StaticTranslationString = {
  de: 'Anmelden',
  en: 'Log In',
  fr: 'Connexion',
};

export const LoginButton: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  return (
    <button
      onClick={() => {
        signIn('hitobito', { redirect: true }).catch((error: unknown) => console.error(error));
      }}
      className="font-heading bg-conveniat-green mt-10 w-full rounded-[8px] px-8 py-3 text-center text-lg leading-normal font-bold text-green-100 duration-100 hover:bg-green-700"
    >
      {loginText[locale]}
    </button>
  );
};
