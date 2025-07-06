'use client';

import type {
  CampMapAnnotationPoint,
  CampMapAnnotationPolygon,
  CeviLogoMarker,
  InitialMapPose,
} from '@/features/map/types/types';
import dynamic from 'next/dynamic';
import type React from 'react';

const LazyMapLibreRenderer = dynamic(() => import('@/features/map/components/map-renderer'), {
  ssr: false,
});

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
  campMapAnnotationPoints?: CampMapAnnotationPoint[] | undefined;
  campMapAnnotationPolygons?: CampMapAnnotationPolygon[] | undefined;
  limitUsage?: boolean;
  validateStyle?: boolean;
}): React.JSX.Element => {
  // default values for optional parameters
  campMapAnnotationPoints ??= [];
  campMapAnnotationPolygons ??= [];

  return (
    <LazyMapLibreRenderer
      initialMapPose={initialMapPose}
      ceviLogoMarkers={ceviLogoMarkers}
      campMapAnnotationPoints={campMapAnnotationPoints}
      campMapAnnotationPolygons={campMapAnnotationPolygons}
      limitUsage={limitUsage}
      validateStyle={validateStyle}
    />
  );
};
