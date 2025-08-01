'use client';

import { CeviLogo } from '@/components/svg-logos/cevi-logo';
import { AnnotationDetailsDrawer } from '@/features/map/components/map-annotations/annotation-details-drawer';
import { MapContextProvider } from '@/features/map/components/maplibre-renderer/map-context-provider';
import { MaplibreMap } from '@/features/map/components/maplibre-renderer/maplibre-map';
import { useMapInitialization } from '@/features/map/hooks/use-map-initialization';
import { useMapUrlSync } from '@/features/map/hooks/use-map-url-sync';
import type {
  CampMapAnnotationPoint,
  CampMapAnnotationPolygon,
  CampScheduleEntry,
  CeviLogoMarker,
  InitialMapPose,
} from '@/features/map/types/types';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { reactToDomElement } from '@/utils/react-to-dom-element';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';
import { useCallback, useRef, useState } from 'react';

/**
 * Factory function to create a DOM element with the Cevi Logo SVG.
 * Used by the `useCeviLogoMarkers` hook.
 * @returns a DOM element with the Cevi Logo SVG
 */
export const ceviLogoMarkerElementFactory = (): HTMLElement =>
  reactToDomElement(<CeviLogo className="h-5 w-5" />);

export const MapLibreRenderer = ({
  initialMapPose,
  ceviLogoMarkers,
  campMapAnnotationPoints,
  campMapAnnotationPolygons,
  schedules,
  limitUsage = true,
  validateStyle = true,
}: {
  initialMapPose: InitialMapPose;
  ceviLogoMarkers: CeviLogoMarker[];
  campMapAnnotationPoints: CampMapAnnotationPoint[];
  campMapAnnotationPolygons: CampMapAnnotationPolygon[];
  schedules: { [id: string]: CampScheduleEntry[] };
  limitUsage?: boolean;
  validateStyle?: boolean;
}): React.JSX.Element => {
  const mapContainerReference = useRef<HTMLDivElement>(null);
  const [openAnnotation, setOpenAnnotation] = useState<
    CampMapAnnotationPoint | CampMapAnnotationPolygon | undefined
  >();

  const closeDrawer = useCallback(() => setOpenAnnotation(undefined), []);
  const locale = useCurrentLocale(i18nConfig) as Locale;

  const map = useMapInitialization(mapContainerReference, {
    initialMapPose,
    limitUsage,
    validateStyle,
  });

  useMapUrlSync(
    openAnnotation,
    setOpenAnnotation,
    closeDrawer,
    campMapAnnotationPoints,
    campMapAnnotationPolygons,
  );

  return (
    <MapContextProvider map={map}>
      {openAnnotation && (
        <AnnotationDetailsDrawer
          closeDrawer={closeDrawer}
          annotation={openAnnotation}
          locale={locale}
          schedule={schedules[openAnnotation.id]}
        />
      )}
      <div className="h-full w-full" ref={mapContainerReference} />
      <MaplibreMap
        openAnnotation={openAnnotation}
        setOpenAnnotation={setOpenAnnotation}
        campMapAnnotationPoints={campMapAnnotationPoints}
        campMapAnnotationPolygons={campMapAnnotationPolygons}
        ceviLogoMarkers={ceviLogoMarkers}
      />
    </MapContextProvider>
  );
};

export default MapLibreRenderer;
