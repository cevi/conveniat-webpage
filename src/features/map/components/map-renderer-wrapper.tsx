'use client';

import { Skeleton } from '@/components/ui/skeleton';
import type {
  CampMapAnnotationPoint,
  CampMapAnnotationPolygon,
  CampScheduleEntry,
  CeviLogoMarker,
  InitialMapPose,
  MapControlOptions,
} from '@/features/map/types/types';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import dynamic from 'next/dynamic';
import React, { useEffect, useRef, useState } from 'react';

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

const useIntersectionObserver = (reference: React.RefObject<Element | null>): boolean => {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = reference.current;
    if (!element) return;

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry?.isIntersecting === true) {
        setIsIntersecting(true);
        observer.disconnect();
      }
    });

    observer.observe(element);

    return (): void => observer.disconnect();
  }, [reference]);

  return isIntersecting;
};

/**
 * This component is a wrapper for the MapLibreRenderer that allows for dynamic loading. This
 * helps to reduce the bundle size and improve performance by loading the map renderer only when it is necessary.
 *
 * It accepts initial map pose, Cevi logo markers, and options for limiting usage and validating style.
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
  const reference = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(reference);

  // default values for optional parameters
  campMapAnnotationPoints ??= [];
  campMapAnnotationPolygons ??= [];

  return (
    <div ref={reference} className="h-full w-full">
      {isVisible ? (
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
      ) : (
        <MapLoadingFallback />
      )}
    </div>
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
  const reference = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(reference);

  // default values for optional parameters
  campMapAnnotationPoints ??= [];
  campMapAnnotationPolygons ??= [];

  return (
    <div ref={reference} className="h-full w-full">
      {isVisible ? (
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
      ) : (
        <MiniMapLoadingFallback />
      )}
    </div>
  );
};
