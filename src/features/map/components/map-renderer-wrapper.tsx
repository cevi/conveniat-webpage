'use client';

import type {
  CampMapAnnotationPoint,
  CampMapAnnotationPolygon,
  CampScheduleEntry,
  CeviLogoMarker,
  InitialMapPose,
} from '@/features/map/types/types';
import type { MapControlOptions } from '@/features/map/hooks/use-map-controls';
import dynamic from 'next/dynamic';
import type React from 'react';

const LazyMapLibreRenderer = dynamic(
  () => import('@/features/map/components/maplibre-renderer/map-renderer'),
  {
    ssr: false,
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
  campMapAnnotationPoints?: CampMapAnnotationPoint[];
  campMapAnnotationPolygons?: CampMapAnnotationPolygon[];
  schedules: { [id: string]: CampScheduleEntry[] };
  limitUsage?: boolean;
  validateStyle?: boolean;
  mapControlOptions?: MapControlOptions | undefined;
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
      schedules={schedules}
      limitUsage={limitUsage}
      validateStyle={validateStyle}
      mapControlOptions={mapControlOptions}
    />
  );
};
