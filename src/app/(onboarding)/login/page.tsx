'use client';
import { Button } from '@/components/ui/buttons/button';
import { IconTile } from '@/components/ui/icon-tile';
import { OnboardingFrame } from '@/features/onboarding/components/onboarding-frame';
import { OnboardingStepScreen } from '@/features/onboarding/components/onboarding-step';
import type { StaticTranslationString } from '@/types/types';
import { i18nConfig, type Locale } from '@/types/types';
import { handleLogin } from '@/utils/login-handler';
import { LogIn } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React from 'react';

const loginTitle: StaticTranslationString = {
  en: 'Log in',
  de: 'Anmelden',
  fr: 'Connexion',
};

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

const LoginScreen: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  return (
    <OnboardingFrame>
      <OnboardingStepScreen
        visual={<IconTile icon={LogIn} size="lg" />}
        title={loginTitle[locale]}
        description={loginText[locale]}
        actions={
          <Button variant="primary" size="touch" onClick={() => handleLogin()}>
            {loginButtonText[locale]}
          </Button>
        }
      />
    </OnboardingFrame>
  );
};

export default LoginScreen;
