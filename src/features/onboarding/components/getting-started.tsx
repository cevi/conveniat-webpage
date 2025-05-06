import { CenteredConveniatLogo } from '@/features/onboarding/components/centered-conveniat-logo';
import type { StaticTranslationString } from '@/types/types';
import React from 'react';

const gettingReadyText: StaticTranslationString = {
  en: 'Getting the application ready for you.',
  de: 'Das App wird für dich vorbereitet.',
  fr: 'Préparation de l’application pour vous.',
};

export const GettingReadyEntrypointComponent: React.FC<{
  locale: 'de' | 'fr' | 'en';
}> = ({ locale }) => {
  return (
    <div className="rounded-lg p-8 text-center">
      <CenteredConveniatLogo />
      <p className="mb-4 text-balance text-gray-700">{gettingReadyText[locale]}</p>
    </div>
  );
};
