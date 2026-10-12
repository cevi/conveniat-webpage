'use client';

import { SetHeaderActions } from '@/components/header/header-actions';
import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import type React from 'react';

const pageTitle: StaticTranslationString = {
  de: 'Lagerplatz',
  en: 'Campsite',
  fr: 'Terrain du camp',
};

/** "Lagerplatz" on the left, the way Programm has it; the map brings its own search. */
export const MapPageHeader: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  return (
    <>
      <SetDynamicPageTitle newTitle={pageTitle[locale]} />
      <SetHeaderActions />
    </>
  );
};
