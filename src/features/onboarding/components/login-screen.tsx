import { CenteredConveniatLogo } from '@/features/onboarding/components/centered-conveniat-logo';
import type { StaticTranslationString } from '@/types/types';
import { handleLogin } from '@/utils/login-handler';
import React from 'react';

const loginText: StaticTranslationString = {
  en: 'Some app functionality require authentication, please log in.',
  de: 'Einige Funktionen der App erfordern eine Authentifizierung, bitte melde dich an.',
  fr: "Certaines fonctionnalités de l'application nécessitent une authentification, veuillez vous connecter.",
};

const loginButtonText: StaticTranslationString = {
  en: 'Login with Cevi.DB',
  de: 'Anmelden mit Cevi.DB',
  fr: 'Connexion avec Cevi.DB',
};

const loginDismissText: StaticTranslationString = {
  en: 'Skip for now',
  de: 'Überspringen',
  fr: 'Ignorer pour l’instant',
};

export const LoginScreen: React.FC<{ onClick: () => void; locale: 'de' | 'fr' | 'en' }> = ({
  onClick,
  locale,
}) => {
  return (
    <div className="flex flex-col rounded-lg p-8 text-center">
      <CenteredConveniatLogo />

      <p className="mb-4 text-balance text-gray-700">{loginText[locale]}</p>
      <button
        onClick={handleLogin}
        className="font-heading rounded-[8px] bg-red-700 px-8 py-3 text-center text-lg leading-normal font-bold text-red-100 duration-100 hover:bg-red-800"
      >
        {loginButtonText[locale]}
      </button>

      <button onClick={onClick} className="mt-3 font-semibold text-gray-400">
        {loginDismissText[locale]}
      </button>
    </div>
  );
};
