'use client';

import { CeviLogo } from '@/components/svg-logos/cevi-logo';
import { AnnotationDetailsDrawer } from '@/features/map/components/map-annotations/annotation-details-drawer';
import { MapUnavailableFallback } from '@/features/map/components/map-unavailable-fallback';
import { MapContextProvider } from '@/features/map/components/maplibre-renderer/map-context-provider';
import { MaplibreMap } from '@/features/map/components/maplibre-renderer/maplibre-map';
import { SearchBar } from '@/features/map/components/search-bar';
import { useMapInitialization } from '@/features/map/hooks/use-map-initialization';
import { useMapUrlSync } from '@/features/map/hooks/use-map-url-sync';
import type {
  CampMapAnnotationPoint,
  CampMapAnnotationPolygon,
  CampScheduleEntry,
  CeviLogoMarker,
  InitialMapPose,
  MapControlOptions,
} from '@/features/map/types/types';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { reactToDomElement } from '@/utils/react-to-dom-element';
import { ServiceWorkerMessages } from '@/utils/service-worker-messages';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

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
  selectedAnnotationId,
  hideDrawer = false,
  disableUrlSync = false,
  disableFlyTo = false,
  enableSearch = false,
  unavailableFallback,
}: {
  initialMapPose: InitialMapPose;
  ceviLogoMarkers: CeviLogoMarker[];
  campMapAnnotationPoints: CampMapAnnotationPoint[];
  campMapAnnotationPolygons: CampMapAnnotationPolygon[];
  schedules: { [id: string]: CampScheduleEntry[] };
  limitUsage?: boolean;
  validateStyle?: boolean;
  mapControlOptions?: MapControlOptions | undefined;
  selectedAnnotationId?: string;
  hideDrawer?: boolean;
  disableUrlSync?: boolean;
  disableFlyTo?: boolean;
  enableSearch?: boolean;
  /** Rendered instead of the map when it cannot be initialized on this device. */
  unavailableFallback?: React.ReactNode;
}): React.JSX.Element => {
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | undefined>();
  const [openAnnotation, setOpenAnnotation] = useState<
    CampMapAnnotationPoint | CampMapAnnotationPolygon | undefined
  >(() => {
    // Initialize with selected annotation if provided
    if (selectedAnnotationId !== undefined && selectedAnnotationId !== '') {
      const selectedPoint = campMapAnnotationPoints.find((a) => a.id === selectedAnnotationId);
      if (selectedPoint) return selectedPoint;
      const selectedPolygon = campMapAnnotationPolygons.find((a) => a.id === selectedAnnotationId);
      if (selectedPolygon) return selectedPolygon;
    }
    return;
  });
  const [searchTerm, setSearchTerm] = useState<string>('');

  const closeDrawer = useCallback(() => setOpenAnnotation(undefined), []);
  const locale = useCurrentLocale(i18nConfig) as Locale;

  const [annotationPoints, setAnnotationPoints] =
    useState<CampMapAnnotationPoint[]>(campMapAnnotationPoints);
  const [annotationPolygons, setAnnotationPolygons] =
    useState<CampMapAnnotationPolygon[]>(campMapAnnotationPolygons);
  const [schedulesState, setSchedulesState] = useState<{ [id: string]: CampScheduleEntry[] }>(
    schedules,
  );

  // Sync state if props change (e.g. key/prop changes)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnnotationPoints(campMapAnnotationPoints);
  }, [campMapAnnotationPoints]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnnotationPolygons(campMapAnnotationPolygons);
  }, [campMapAnnotationPolygons]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSchedulesState(schedules);
  }, [schedules]);

  // Fetch updated map data when online
  const { data: updatedMapData } = trpc.map.getMapAnnotations.useQuery(
    { locale },
    {
      enabled: true,
      staleTime: 5 * 60 * 1000,

      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
  );

  useEffect(() => {
    if (updatedMapData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnnotationPoints(updatedMapData.campMapAnnotationPoints);

      setAnnotationPolygons(updatedMapData.campMapAnnotationPolygons);

      setSchedulesState(updatedMapData.schedules);

      // Trigger background update of the PWA offline cache for `/app/map` page & RSC
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: ServiceWorkerMessages.UPDATE_MAP_CACHE,
          locale,
        });
      }
    }
  }, [updatedMapData, locale]);

  /*
   * Keep the selected annotation resolved against the annotations actually on the map.
   *
   * The initial state is read once, from the props - but this component then fetches the whole
   * annotation set itself and replaces them. A caller that asks for an annotation the passed
   * arrays did not contain (a mini map handed a polygon, a deep link opened before the data
   * arrived) therefore had nothing selected, and nothing on the map was marked as the one being
   * asked about.
   */
  useEffect(() => {
    if (selectedAnnotationId === undefined || selectedAnnotationId === '') return;
    if (openAnnotation?.id === selectedAnnotationId) return;

    const selected =
      annotationPoints.find((annotation) => annotation.id === selectedAnnotationId) ??
      annotationPolygons.find((annotation) => annotation.id === selectedAnnotationId);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (selected !== undefined) setOpenAnnotation(selected);
  }, [selectedAnnotationId, annotationPoints, annotationPolygons, openAnnotation?.id]);

  // Sync openAnnotation reference when state updates
  useEffect(() => {
    if (openAnnotation) {
      const updatedPoint = annotationPoints.find((a) => a.id === openAnnotation.id);
      if (updatedPoint && updatedPoint !== openAnnotation) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOpenAnnotation(updatedPoint);
        return;
      }
      const updatedPolygon = annotationPolygons.find((a) => a.id === openAnnotation.id);
      if (updatedPolygon && updatedPolygon !== openAnnotation) {
        setOpenAnnotation(updatedPolygon);
      }
    }
  }, [annotationPoints, annotationPolygons, openAnnotation]);

  const { map, initializationFailed } = useMapInitialization(mapContainer, {
    initialMapPose,
    limitUsage,
    validateStyle,
  });

  useMapUrlSync(
    openAnnotation,
    setOpenAnnotation,
    closeDrawer,
    annotationPoints,
    annotationPolygons,
    !disableUrlSync,
  );

  // Filter annotations based on hiddenOnDefaultMap and open status
  const visibleAnnotationPoints = useMemo(() => {
    return annotationPoints.filter(
      (annotation) => !annotation.hiddenOnDefaultMap || annotation.id === openAnnotation?.id,
    );
  }, [annotationPoints, openAnnotation?.id]);

  const visibleAnnotationPolygons = useMemo(() => {
    return annotationPolygons.filter(
      (annotation) => !annotation.hiddenOnDefaultMap || annotation.id === openAnnotation?.id,
    );
  }, [annotationPolygons, openAnnotation?.id]);

  // Filter annotations based on search term
  const filteredAnnotationPoints = useMemo(() => {
    if (searchTerm === '') {
      return visibleAnnotationPoints;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return visibleAnnotationPoints.filter((annotation) =>
      annotation.title.toLowerCase().includes(lowerCaseSearchTerm),
    );
  }, [visibleAnnotationPoints, searchTerm]);

  const filteredAnnotationPolygons = useMemo(() => {
    if (searchTerm === '') {
      return visibleAnnotationPolygons;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return visibleAnnotationPolygons.filter((annotation) =>
      annotation.title.toLowerCase().includes(lowerCaseSearchTerm),
    );
  }, [visibleAnnotationPolygons, searchTerm]);

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

  // MapLibre could not acquire a WebGL context; degrade instead of crashing the page.
  if (initializationFailed) {
    return <>{unavailableFallback ?? <MapUnavailableFallback />}</>;
  }

  return (
    <MapContextProvider map={map}>
      {openAnnotation && !hideDrawer && (
        <AnnotationDetailsDrawer
          closeDrawer={closeDrawer}
          annotation={openAnnotation}
          locale={locale}
          schedule={schedulesState[openAnnotation.id]}
        />
      )}
      <div className="h-full w-full" ref={(element) => setMapContainer(element ?? undefined)} />
      {enableSearch && <SearchBar onSearch={handleSearch} />}
      <MaplibreMap
        openAnnotation={openAnnotation}
        setOpenAnnotation={setOpenAnnotation}
        campMapAnnotationPoints={filteredAnnotationPoints}
        campMapAnnotationPolygons={filteredAnnotationPolygons}
        ceviLogoMarkers={ceviLogoMarkers}
        mapControlOptions={mapControlOptions}
        disableFlyTo={disableFlyTo}
      />
    </MapContextProvider>
  );
};

export default MapLibreRenderer;
