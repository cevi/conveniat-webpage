'use client';

import { Skeleton } from '@/components/ui/skeleton';
import type { MapControlOptions } from '@/features/map/hooks/use-map-controls';
import type {
  CampMapAnnotationPoint,
  CampMapAnnotationPolygon,
  CampScheduleEntry,
  CeviLogoMarker,
  InitialMapPose,
} from '@/features/map/types/types';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import dynamic from 'next/dynamic';
import type React from 'react';

const mapLoadingText: StaticTranslationString = {
  en: 'Loading map...',
  de: 'Karte wird geladen...',
  fr: 'Chargement de la carte...',
};

const MapLoadingFallback: React.FC = () => {
  const locale = (useCurrentLocale(i18nConfig) as Locale | undefined) ?? 'de';
  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="border-conveniat-green mx-auto h-12 w-12 animate-spin rounded-full border-3 border-solid border-t-transparent" />
        <p className="mt-4 text-sm text-gray-500">{mapLoadingText[locale]}</p>
      </div>
    </div>
  );
};

const LazyMapLibreRenderer = dynamic(
  () => import('@/features/map/components/maplibre-renderer/map-renderer'),
  {
    ssr: false,
    loading: () => <MapLoadingFallback />,
  },
);

const MiniMapLoadingFallback: React.FC = () => <Skeleton className="h-full w-full bg-gray-200" />;

const LazyMiniMapLibreRenderer = dynamic(
  () => import('@/features/map/components/maplibre-renderer/map-renderer'),
  {
    ssr: false,
    loading: () => <MiniMapLoadingFallback />,
  },
);

/***
 * This component is a wrapper for the MapLibreRenderer that allows for dynamic loading. This
 * helps to reduce the bundle size and improve performance by loading the map renderer only when it is necessary.
 *
 *
 * It accepts initial map pose, Cevi logo markers, and options for limiting usage and validating style.
 *
 * @param initialMapPose
 * @param ceviLogoMarkers
 * @param campMapAnnotation
 * @param limitUsage
 * @param validateStyle
 * @constructor
 */
export interface MapLibreRendererProperties {
  initialMapPose: InitialMapPose;
  ceviLogoMarkers: CeviLogoMarker[];
  campMapAnnotationPoints?: CampMapAnnotationPoint[];
  campMapAnnotationPolygons?: CampMapAnnotationPolygon[];
  schedules: { [id: string]: CampScheduleEntry[] };
  limitUsage?: boolean;
  validateStyle?: boolean;
  mapControlOptions?: MapControlOptions | undefined;
  selectedAnnotationId?: string;
  hideDrawer?: boolean;
  disableUrlSync?: boolean;
  disableFlyTo?: boolean;
}

export const MapLibreRenderer = ({
  initialMapPose,
  ceviLogoMarkers,
  campMapAnnotationPoints,
  campMapAnnotationPolygons,
  schedules,
  limitUsage = true,
  validateStyle = true,
  mapControlOptions,
  selectedAnnotationId,
  hideDrawer,
  disableUrlSync,
  disableFlyTo,
}: MapLibreRendererProperties): React.JSX.Element => {
  // default values for optional parameters
  campMapAnnotationPoints ??= [];
  campMapAnnotationPolygons ??= [];

  return (
    <LazyMapLibreRenderer
      initialMapPose={initialMapPose}
      ceviLogoMarkers={ceviLogoMarkers}
      campMapAnnotationPoints={campMapAnnotationPoints}
      campMapAnnotationPolygons={campMapAnnotationPolygons}
      schedules={schedules}
      limitUsage={limitUsage}
      validateStyle={validateStyle}
      mapControlOptions={mapControlOptions}
      {...(selectedAnnotationId !== undefined && { selectedAnnotationId })}
      {...(hideDrawer !== undefined && { hideDrawer })}
      {...(disableUrlSync !== undefined && { disableUrlSync })}
      {...(disableFlyTo !== undefined && { disableFlyTo })}
    />
  );
};

export const MiniMapLibreRenderer = ({
  initialMapPose,
  ceviLogoMarkers,
  campMapAnnotationPoints,
  campMapAnnotationPolygons,
  schedules,
  limitUsage = true,
  validateStyle = true,
  mapControlOptions,
  selectedAnnotationId,
  hideDrawer,
  disableUrlSync,
  disableFlyTo,
}: MapLibreRendererProperties): React.JSX.Element => {
  // default values for optional parameters
  campMapAnnotationPoints ??= [];
  campMapAnnotationPolygons ??= [];

  return (
    <LazyMiniMapLibreRenderer
      initialMapPose={initialMapPose}
      ceviLogoMarkers={ceviLogoMarkers}
      campMapAnnotationPoints={campMapAnnotationPoints}
      campMapAnnotationPolygons={campMapAnnotationPolygons}
      schedules={schedules}
      limitUsage={limitUsage}
      validateStyle={validateStyle}
      mapControlOptions={mapControlOptions}
      {...(selectedAnnotationId !== undefined && { selectedAnnotationId })}
      {...(hideDrawer !== undefined && { hideDrawer })}
      {...(disableUrlSync !== undefined && { disableUrlSync })}
      {...(disableFlyTo !== undefined && { disableFlyTo })}
    />
  );
};
