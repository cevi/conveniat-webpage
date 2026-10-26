'use client';
import { Button } from '@/components/ui/buttons/button';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { startCeviDatabaseLogin } from '@/utils/login-handler';
import { LogIn } from 'lucide-react';
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
    <Button
      variant="primary"
      size="touch"
      className="w-full"
      onClick={() => {
        void startCeviDatabaseLogin('/entrypoint');
      }}
    >
      <LogIn aria-hidden="true" />
      {loginText[locale]}
    </Button>
  );
};
