import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { CampMapComponent } from '@/features/map/components/camp-map-component';
import type { Locale, StaticTranslationString } from '@/types/types';
import type { Metadata } from 'next';
import type React from 'react';

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
  params: {
    locale: Locale;
    slugs: string[] | undefined;
  };
}): Promise<Metadata> => {
  return {
    title: `${tabTitle[params.locale]}`,
    description: `${description[params.locale]} conveniat27`,
  };
};

const MapPage: React.FC = () => {
  return (
    <>
      <SetDynamicPageTitle newTitle="Lagerplatz" />
      <CampMapComponent />
    </>
  );
};

export default MapPage;
