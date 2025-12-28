'use client';

import type { StaticTranslationString } from '@/types/types';
import { handleLogin } from '@/utils/login-handler';
import { Loader2 } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

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

const loadingText: StaticTranslationString = {
  en: 'Connecting...',
  de: 'Verbinde...',
  fr: 'Connexion...',
};

const errorText: StaticTranslationString = {
  en: 'Connection failed. Please try again.',
  de: 'Verbindung fehlgeschlagen. Bitte erneut versuchen.',
  fr: 'Échec de la connexion. Veuillez réessayer.',
};

export const loginDismissText: StaticTranslationString = {
  en: 'Skip for now',
  de: 'Überspringen',
  fr: "Passer pour l'instant",
};

/** Timeout for the redirect to hitobito (not the full OAuth flow) */
const REDIRECT_TIMEOUT_MS = 15_000;

export const LoginScreen: React.FC<{ locale: 'de' | 'fr' | 'en' }> = ({ locale }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const timeoutReference = useRef<NodeJS.Timeout | null>(null);

  // Clean up timeout on unmount (in case component unmounts during redirect)
  useEffect(() => {
    return (): void => {
      if (timeoutReference.current) {
        clearTimeout(timeoutReference.current);
      }
    };
  }, []);

  const handleLoginClick = useCallback(() => {
    // Reset error state and start loading
    setHasError(false);
    setIsLoading(true);

    timeoutReference.current = setTimeout(() => {
      // Only show error if we're still mounted and loading
      // (if redirect succeeded, this component would be unmounted)
      setIsLoading(false);
      setHasError(true);
    }, REDIRECT_TIMEOUT_MS);

    // Trigger the OAuth redirect
    handleLogin();
  }, []);

  return (
    <>
      <p className="mb-8 text-lg text-balance text-gray-700">{loginText[locale]}</p>
      <button
        onClick={handleLoginClick}
        disabled={isLoading}
        className={`font-heading flex min-h-[52px] w-full transform items-center justify-center gap-2 rounded-[8px] bg-red-700 px-8 py-3 text-center text-lg leading-normal font-bold text-red-100 shadow-md duration-100 ${
          isLoading
            ? 'cursor-wait'
            : 'cursor-pointer hover:scale-[1.02] hover:bg-red-800 active:scale-[0.98]'
        }`}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>{loadingText[locale]}</span>
          </>
        ) : (
          loginButtonText[locale]
        )}
      </button>
      {hasError && (
        <p className="mt-4 text-center text-sm text-red-600" role="alert">
          {errorText[locale]}
        </p>
      )}
    </>
  );
};
