'use client';

import { CeviLogo } from '@/components/svg-logos/cevi-logo';
import { MapAnnotationDetailsDrawer } from '@/features/map/components/map-annotation-details-drawer';
import { useAnnotationPointMarkers } from '@/features/map/hooks/use-annotation-point-markers';
import { useAnnotationPolygons } from '@/features/map/hooks/use-annotation-polygons';
import { useCeviLogoMarkers } from '@/features/map/hooks/use-cevi-logo-markers';
import { useFlyToAnnotation } from '@/features/map/hooks/use-fly-to-annotation';
import { useMapInitialization } from '@/features/map/hooks/use-map-initialization';
import { useMapControls } from '@/features/map/hooks/useMapControls';
import { useMapUrlSync } from '@/features/map/hooks/useMapUrlSync';
import type {
  CampMapAnnotationPoint,
  CampMapAnnotationPolygon,
  CeviLogoMarker,
  InitialMapPose,
} from '@/features/map/types/types';
import { reactToDomElement } from '@/utils/react-to-dom-element';
import 'maplibre-gl/dist/maplibre-gl.css';
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
  limitUsage = true,
  validateStyle = true,
}: {
  initialMapPose: InitialMapPose;
  ceviLogoMarkers: CeviLogoMarker[];
  campMapAnnotationPoints: CampMapAnnotationPoint[];
  campMapAnnotationPolygons: CampMapAnnotationPolygon[];
  limitUsage?: boolean;
  validateStyle?: boolean;
}): React.JSX.Element => {
  const mapContainerReference = useRef<HTMLDivElement>(null);
  const [openAnnotation, setOpenAnnotation] = useState<
    CampMapAnnotationPoint | CampMapAnnotationPolygon | undefined
  >();

  const closeDrawer = useCallback(() => setOpenAnnotation(undefined), []);

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

  useMapControls(map);

  useCeviLogoMarkers(map, ceviLogoMarkers, ceviLogoMarkerElementFactory);

  useAnnotationPointMarkers(map, campMapAnnotationPoints, openAnnotation, setOpenAnnotation);

  useAnnotationPolygons(map, campMapAnnotationPolygons, (annotation) => {
    setOpenAnnotation(annotation);
  });

  useFlyToAnnotation(map, openAnnotation);

  return (
    <>
      {openAnnotation && (
        <MapAnnotationDetailsDrawer closeDrawer={closeDrawer} annotation={openAnnotation} />
      )}
      <div className="h-full w-full" ref={mapContainerReference} />
    </>
  );
};

export default MapLibreRenderer;
