import type { StaticTranslationString } from '@/types/types';
import { handleLogin } from '@/utils/login-handler';
import React from 'react';

const loginText: StaticTranslationString = {
  en: 'Some app functionality require authentication, please log in.',
  de: 'Einige Funktionen der App erfordern eine Authentifizierung, bitte melde dich an.',
  fr: 'Cette application nécessite une authentification pour certaines fonctionnalités. Veuillez vous connecter.',
};

const loginButtonText: StaticTranslationString = {
  en: 'Login with Cevi.DB',
  de: 'Anmelden mit Cevi.DB',
  fr: 'Se connecter avec Cevi.DB',
};

export const loginDismissText: StaticTranslationString = {
  en: 'Skip for now',
  de: 'Überspringen',
  fr: 'Passer pour l’instant',
};

export const LoginScreen: React.FC<{ locale: 'de' | 'fr' | 'en' }> = ({ locale }) => {
  return (
    <>
      <p className="mb-8 text-lg text-balance text-gray-700">{loginText[locale]}</p>
      <button
        onClick={handleLogin}
        className="font-heading transform cursor-pointer rounded-[8px] bg-red-700 px-8 py-3 text-center text-lg leading-normal font-bold text-red-100 shadow-md duration-100 hover:scale-[1.02] hover:bg-red-800 active:scale-[0.98]"
      >
        {loginButtonText[locale]}
      </button>
    </>
  );
};
