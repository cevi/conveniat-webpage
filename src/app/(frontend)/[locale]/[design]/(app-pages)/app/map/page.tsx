import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { CampMapComponent } from '@/features/map/components/camp-map-component';
import type { Locale, StaticTranslationString } from '@/types/types';
import { NoBuildTimePreRendering } from '@/utils/is-pre-rendering';
import type { Metadata } from 'next';
import React from 'react';

const tabTitle: StaticTranslationString = {
  en: 'Camp Map',
  de: 'Lagerplatz-Karte',
  fr: 'Carte du camp',
};

const description: StaticTranslationString = {
  en: 'Interactive map of the Cevi camp',
  de: 'Interaktive Karte des Cevi-Lagers',
  fr: 'Carte interactive du camp Cevi',
};

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{
    locale: Locale;
    slugs: string[] | undefined;
  }>;
}): Promise<Metadata> => {
  const { locale } = await params;

  return {
    title: `${tabTitle[locale]}`,
    description: `${description[locale]} conveniat27`,
  };
};

const MapPage: React.FC<{ params: Promise<{ locale: Locale }> }> = ({ params }) => {
  const locale = params.then((p) => p.locale);

  return (
    <>
      <SetDynamicPageTitle newTitle="Lagerplatz" />
      <NoBuildTimePreRendering>
        <CampMapComponent locale={locale} />
      </NoBuildTimePreRendering>
    </>
  );
};

export default MapPage;
