'use client';
import { CeviLogo } from '@/components/svg-logos/cevi-logo';
import { ForumMapOverlays } from '@/features/map/components/forum/forum-map-overlays';
import { AnnotationDetailsDrawer } from '@/features/map/components/map-annotations/annotation-details-drawer';
import { MapSearchRow } from '@/features/map/components/map-search-row';
import { MapUnavailableFallback } from '@/features/map/components/map-unavailable-fallback';
import { MapContextProvider } from '@/features/map/components/maplibre-renderer/map-context-provider';
import { MaplibreMap } from '@/features/map/components/maplibre-renderer/maplibre-map';
import { useMapInitialization } from '@/features/map/hooks/use-map-initialization';
import { useMapSearchTerm } from '@/features/map/hooks/use-map-search-term';
import { useMapUrlSync } from '@/features/map/hooks/use-map-url-sync';
import type {
  CampMapAnnotationPoint,
  CampMapAnnotationPolygon,
  CeviLogoMarker,
  InitialMapPose,
  MapControlOptions,
  MapQuartier,
} from '@/features/map/types/types';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { useTRPC } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { quartierRufnameOf, shortQuartierName } from '@/utils/quartier-names';
import { reactToDomElement } from '@/utils/react-to-dom-element';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

/**
 * Factory function to create a DOM element with the Cevi Logo SVG.
 * Used by the `useCeviLogoMarkers` hook.
 * @returns a DOM element with the Cevi Logo SVG
 */
/**
 * Whether a place answers a search: by its own name, or by its Quartier's name, Rufname or
 * short name, "Quartier 5 - Greif", "Greif" or "Q5".
 */
const matchesSearch = (
  annotation: { title: string; quartier?: MapQuartier | undefined },
  searchTerm: string,
): boolean => {
  const term = searchTerm.toLowerCase();
  const { quartier } = annotation;
  const names =
    quartier === undefined
      ? [annotation.title]
      : [annotation.title, quartier.name, quartierRufnameOf(quartier), shortQuartierName(quartier)];
  return names.some((name) => name.toLowerCase().includes(term));
};

export const ceviLogoMarkerElementFactory = (): HTMLElement =>
  reactToDomElement(<CeviLogo className="h-5 w-5" />);

export const MapLibreRenderer = ({
  initialMapPose,
  ceviLogoMarkers,
  campMapAnnotationPoints,
  campMapAnnotationPolygons,
  limitUsage = true,
  validateStyle = true,
  mapControlOptions,
  selectedAnnotationId,
  hideDrawer = false,
  disableUrlSync = false,
  disableFlyTo = false,
  enableSearch = false,
  unavailableFallback,
  mapStyle,
}: {
  initialMapPose: InitialMapPose;
  ceviLogoMarkers: CeviLogoMarker[];
  campMapAnnotationPoints: CampMapAnnotationPoint[];
  campMapAnnotationPolygons: CampMapAnnotationPolygon[];
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
  /** URL of the MapLibre style; the swisstopo base map when omitted. */
  mapStyle?: string;
}): React.JSX.Element => {
  const trpc = useTRPC();
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
  const [searchTerm, setSearchTerm] = useMapSearchTerm();

  const closeDrawer = useCallback(() => setOpenAnnotation(undefined), []);
  const locale = useCurrentLocale(i18nConfig) as Locale;

  // The places come from the query cache: restored from the device at once, offline as well,
  // and refreshed in the background, see `query-client.ts`. The props only stand in until the
  // cache holds a copy.
  const { data: mapData } = useQuery(trpc.map.getMapAnnotations.queryOptions({ locale }));
  // the persisted query cache may hold anything an older version stored under this key
  const annotationPoints = useMemo(
    () =>
      Array.isArray(mapData?.campMapAnnotationPoints)
        ? mapData.campMapAnnotationPoints
        : campMapAnnotationPoints,
    [mapData, campMapAnnotationPoints],
  );
  const annotationPolygons = useMemo(
    () =>
      Array.isArray(mapData?.campMapAnnotationPolygons)
        ? mapData.campMapAnnotationPolygons
        : campMapAnnotationPolygons,
    [mapData, campMapAnnotationPolygons],
  );

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
    ...(mapStyle !== undefined && { style: mapStyle }),
    locale,
  });

  // While the forum's composer picks a spot, a tap places its pin: no place opens, and the
  // address keeps the picker's parameters instead of naming a place.
  const searchParameters = useSearchParams();
  const isPickingForumSpot = enableSearch && searchParameters.get('pickForum') === '1';
  const noAnnotation = useCallback((): void => {}, []);

  useMapUrlSync(
    openAnnotation,
    setOpenAnnotation,
    closeDrawer,
    annotationPoints,
    annotationPolygons,
    !disableUrlSync && !isPickingForumSpot,
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
    return visibleAnnotationPoints.filter((annotation) => matchesSearch(annotation, searchTerm));
  }, [visibleAnnotationPoints, searchTerm]);

  const filteredAnnotationPolygons = useMemo(() => {
    if (searchTerm === '') {
      return visibleAnnotationPolygons;
    }
    return visibleAnnotationPolygons.filter((annotation) => matchesSearch(annotation, searchTerm));
  }, [visibleAnnotationPolygons, searchTerm]);

  const searchResults = useMemo(
    () => [...filteredAnnotationPoints, ...filteredAnnotationPolygons],
    [filteredAnnotationPoints, filteredAnnotationPolygons],
  );

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
    [openAnnotation, filteredAnnotationPoints, filteredAnnotationPolygons, setSearchTerm],
  );

  // MapLibre could not acquire a WebGL context; degrade instead of crashing the page.
  if (initializationFailed) {
    return <>{unavailableFallback ?? <MapUnavailableFallback />}</>;
  }

  return (
    <MapContextProvider map={map}>
      {openAnnotation && !hideDrawer && !isPickingForumSpot && (
        <AnnotationDetailsDrawer
          closeDrawer={closeDrawer}
          annotation={openAnnotation}
          locale={locale}
        />
      )}
      <div className="h-full w-full" ref={(element) => setMapContainer(element ?? undefined)} />
      {/* the picker brings its own bar, with the way back and the locate button */}
      {enableSearch && !isPickingForumSpot && (
        <MapSearchRow value={searchTerm} onSearch={handleSearch} results={searchResults} />
      )}
      {/* the forum belongs to the camp map, not to the small maps of a block or a message */}
      {enableSearch && (
        <ForumMapOverlays
          annotationPoints={annotationPoints}
          annotationPolygons={annotationPolygons}
        />
      )}
      <MaplibreMap
        openAnnotation={openAnnotation}
        setOpenAnnotation={isPickingForumSpot ? noAnnotation : setOpenAnnotation}
        campMapAnnotationPoints={filteredAnnotationPoints}
        campMapAnnotationPolygons={filteredAnnotationPolygons}
        ceviLogoMarkers={ceviLogoMarkers}
        // the search row brings its own locate button
        mapControlOptions={{
          homeBearing: initialMapPose.bearing ?? 0,
          ...mapControlOptions,
          ...(enableSearch && { showGeolocate: false }),
        }}
        disableFlyTo={disableFlyTo}
      />
    </MapContextProvider>
  );
};

export default MapLibreRenderer;
