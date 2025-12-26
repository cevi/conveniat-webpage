import type { Locale, StaticTranslationString } from '@/types/types';
import type React from 'react';

const mapLoadingText: StaticTranslationString = {
  en: 'Loading map...',
  de: 'Karte wird geladen...',
  fr: 'Chargement de la carte...',
};

/**
 * Skeleton loading component for the Map page.
 * Shows a placeholder while the heavy MapLibre library loads.
 */
export default async function MapLoading({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<React.ReactNode> {
  const { locale } = await params;

  return (
    <div className="fixed top-[60px] left-0 h-[calc(100dvh-60px)] w-screen pb-20">
      <div className="flex h-full w-full items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="border-conveniat-green mx-auto h-12 w-12 animate-spin rounded-full border-3 border-solid border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500">{mapLoadingText[locale]}</p>
        </div>
      </div>
    </div>
  );
}
