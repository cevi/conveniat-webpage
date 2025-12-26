'use client';

import { CeviLogo } from '@/components/svg-logos/cevi-logo';
import { AnnotationDetailsDrawer } from '@/features/map/components/map-annotations/annotation-details-drawer';
import { MapContextProvider } from '@/features/map/components/maplibre-renderer/map-context-provider';
import { MaplibreMap } from '@/features/map/components/maplibre-renderer/maplibre-map';
import { SearchBar } from '@/features/map/components/search-bar';
import { useMapInitialization } from '@/features/map/hooks/use-map-initialization';
import type { MapControlOptions } from '@/features/map/hooks/use-map-controls';
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
import React, { useCallback, useMemo, useRef, useState } from 'react';

// TODO: this should only be enabled in app mode
const enableSearch: boolean = false; // Set to true to enable the search bar

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
  mapControlOptions,
}: {
  initialMapPose: InitialMapPose;
  ceviLogoMarkers: CeviLogoMarker[];
  campMapAnnotationPoints: CampMapAnnotationPoint[];
  campMapAnnotationPolygons: CampMapAnnotationPolygon[];
  schedules: { [id: string]: CampScheduleEntry[] };
  limitUsage?: boolean;
  validateStyle?: boolean;
  mapControlOptions?: MapControlOptions | undefined;
}): React.JSX.Element => {
  const mapContainerReference = useRef<HTMLDivElement>(null);
  const [openAnnotation, setOpenAnnotation] = useState<
    CampMapAnnotationPoint | CampMapAnnotationPolygon | undefined
  >();
  const [searchTerm, setSearchTerm] = useState<string>('');

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

  // Filter annotations based on search term
  const filteredAnnotationPoints = useMemo(() => {
    if (searchTerm === '') {
      return campMapAnnotationPoints;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return campMapAnnotationPoints.filter((annotation) =>
      annotation.title.toLowerCase().includes(lowerCaseSearchTerm),
    );
  }, [campMapAnnotationPoints, searchTerm]);

  const filteredAnnotationPolygons = useMemo(() => {
    if (searchTerm === '') {
      return campMapAnnotationPolygons;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return campMapAnnotationPolygons.filter((annotation) =>
      annotation.title.toLowerCase().includes(lowerCaseSearchTerm),
    );
  }, [campMapAnnotationPolygons, searchTerm]);

  const handleSearch = useCallback(
    (term: string) => {
      setSearchTerm(term);
      if (
        openAnnotation &&
        term !== '' &&
        !filteredAnnotationPoints.some((a) => a.id === openAnnotation.id) &&
        !filteredAnnotationPolygons.some((a) => a.id === openAnnotation.id)
      ) {
        setOpenAnnotation(undefined);
      }
    },
    [openAnnotation, filteredAnnotationPoints, filteredAnnotationPolygons],
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
      {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
      {enableSearch && <SearchBar onSearch={handleSearch} />}
      <MaplibreMap
        openAnnotation={openAnnotation}
        setOpenAnnotation={setOpenAnnotation}
        campMapAnnotationPoints={filteredAnnotationPoints}
        campMapAnnotationPolygons={filteredAnnotationPolygons}
        ceviLogoMarkers={ceviLogoMarkers}
        mapControlOptions={mapControlOptions}
      />
    </MapContextProvider>
  );
};

export default MapLibreRenderer;
