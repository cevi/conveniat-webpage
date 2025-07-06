import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';
import type { Map as MapLibre } from 'maplibre-gl';
import { useEffect } from 'react';

export const useFlyToAnnotation = (
  map: MapLibre | null,
  annotation: CampMapAnnotationPoint | CampMapAnnotationPolygon | undefined,
): void => {
  useEffect(() => {
    if (!map || !annotation) return;

    if (
      'coordinates' in annotation.geometry &&
      typeof annotation.geometry.coordinates[0] === 'number' &&
      typeof annotation.geometry.coordinates[1] === 'number'
    ) {
      map.flyTo({
        center: [annotation.geometry.coordinates[0], annotation.geometry.coordinates[1] - 0.0005],
        zoom: 16.5,
        animate: true,
        duration: 500,
      });
    }
  }, [map, annotation]);
};
