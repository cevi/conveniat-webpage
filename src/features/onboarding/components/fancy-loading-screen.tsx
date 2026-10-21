import { ConveniatLogo } from '@/components/svg-logos/conveniat-logo';
import type { StaticTranslationString } from '@/types/types';
import React from 'react';

const loadingText: StaticTranslationString = {
  de: 'Die App wird geladen',
  en: 'The app is loading',
  fr: 'L’application se charge',
};

/**
 * The boot and checking screen: the mark and an indeterminate bar. It is server-rendered and
 * must be visible without JavaScript, so nothing here may start hidden.
 */
export const FancyLoadingScreen: React.FC<{ locale?: 'de' | 'fr' | 'en' }> = ({
  locale = 'en',
}) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-8" role="status">
    <ConveniatLogo className="h-24 w-24" />
    <div className="bg-chip relative h-1.5 w-48 overflow-hidden rounded-full">
      <div className="animate-loading bg-conveniat-green absolute top-0 left-0 h-full w-1/2 rounded-full" />
    </div>
    <span className="sr-only">{loadingText[locale]}</span>
  </div>
);
