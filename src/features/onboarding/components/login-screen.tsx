'use client';

import { Button } from '@/components/ui/buttons/button';
import { IconTile } from '@/components/ui/icon-tile';
import {
  OnboardingNotice,
  OnboardingStepScreen,
} from '@/features/onboarding/components/onboarding-step';
import type { StaticTranslationString } from '@/types/types';
import { handleLogin } from '@/utils/login-handler';
import { Loader2, LogIn } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

const loginTitle: StaticTranslationString = {
  en: 'Log in',
  de: 'Anmelden',
  fr: 'Connexion',
};

const loginText: StaticTranslationString = {
  en: 'The chat and your personal features need your Cevi.DB account.',
  de: 'Für den Chat und deine persönlichen Funktionen brauchst du dein Cevi.DB-Konto.',
  fr: 'Le chat et vos fonctions personnelles nécessitent votre compte Cevi.DB.',
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
  en: 'Cevi.DB did not answer. Check your connection and try again.',
  de: 'Cevi.DB hat nicht geantwortet. Prüfe deine Verbindung und versuche es nochmals.',
  fr: 'Cevi.DB n’a pas répondu. Vérifiez votre connexion et réessayez.',
};

export const loginDismissText: StaticTranslationString = {
  en: 'Continue without logging in',
  de: 'Ohne Anmeldung weiter',
  fr: 'Continuer sans connexion',
};

/** Timeout for the redirect to hitobito (not the full OAuth flow) */
const REDIRECT_TIMEOUT_MS = 15_000;

/** The login step; the way past it without logging in is rendered by the onboarding process. */
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
    handleLogin('/entrypoint');
  }, []);

  return (
    <OnboardingStepScreen
      visual={<IconTile icon={LogIn} size="lg" />}
      title={loginTitle[locale]}
      description={loginText[locale]}
      actions={
        <Button
          variant="primary"
          size="touch"
          onClick={handleLoginClick}
          disabled={isLoading}
          aria-busy={isLoading}
          className="disabled:cursor-wait disabled:opacity-100"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              <span>{loadingText[locale]}</span>
            </>
          ) : (
            loginButtonText[locale]
          )}
        </Button>
      }
    >
      {hasError ? <OnboardingNotice role="alert">{errorText[locale]}</OnboardingNotice> : undefined}
    </OnboardingStepScreen>
  );
};
