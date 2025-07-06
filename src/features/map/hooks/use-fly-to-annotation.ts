import { useMap } from '@/features/map/components/maplibre-renderer/map-context-provider';
import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';
import { useEffect } from 'react';

export const useFlyToAnnotation = (
  annotation: CampMapAnnotationPoint | CampMapAnnotationPolygon | undefined,
): void => {
  const map = useMap();

  // eslint-disable-next-line complexity
  useEffect(() => {
    if (!map || !annotation) return;

    // abort if the annotation does not have a valid geometry
    if (
      !('coordinates' in annotation.geometry) ||
      typeof annotation.geometry.coordinates[0] !== 'number' ||
      typeof annotation.geometry.coordinates[1] !== 'number'
    ) {
      return;
    }

    const mapHeight = map.getCanvas().height;
    const projectedCoordinates = map.project(annotation.geometry.coordinates as [number, number]);

    const annotationY = projectedCoordinates.y;
    const annotationX = projectedCoordinates.x;

    // check if the annotation is in the lower third of the map
    const isInLowerThird = annotationY >= mapHeight / 2;

    // also check if the annotation is close to the top or bottom border of the map
    const isCloseToBorder =
      annotationY < 100 ||
      annotationY > mapHeight - 100 ||
      annotationX < 100 ||
      annotationX > map.getCanvas().width - 100;

    if (!isInLowerThird && !isCloseToBorder) return;
    map.flyTo({
      center: [annotation.geometry.coordinates[0], annotation.geometry.coordinates[1] - 0.002],
      animate: true,
      duration: 1000,
    });
  }, [map, annotation]);
};
