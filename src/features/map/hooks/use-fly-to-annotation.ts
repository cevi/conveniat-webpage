import { useMap } from '@/features/map/components/maplibre-renderer/map-context-provider';
import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';
import { useEffect } from 'react';

export const useFlyToAnnotation = (
  annotation: CampMapAnnotationPoint | CampMapAnnotationPolygon | undefined,
): void => {
  const map = useMap();

  // center marker
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

    const mapHeight = map.getCanvas().clientHeight;
    const projectedCoordinates = map.project(annotation.geometry.coordinates as [number, number]);

    const annotationY = projectedCoordinates.y;
    const annotationX = projectedCoordinates.x;

    // check if the annotation is in the lower third of the map
    const isInLowerThird = annotationY >= mapHeight / 2 - 100;

    // also check if the annotation is close to the top or bottom border of the map
    const isCloseToBorder =
      annotationY < 100 ||
      annotationY > mapHeight - 100 ||
      annotationX < 100 ||
      annotationX > map.getCanvas().width - 100;

    if (!isInLowerThird && !isCloseToBorder) return;
    map.flyTo({
      center: [annotation.geometry.coordinates[0], annotation.geometry.coordinates[1] - 0.002_25],
      animate: true,
      duration: 1000,
    });
  }, [map, annotation]);

  // center polygon
  // eslint-disable-next-line complexity
  useEffect(() => {
    if (!map || !annotation) return;

    if (
      !('coordinates' in annotation.geometry) ||
      !Array.isArray(annotation.geometry.coordinates) ||
      annotation.geometry.coordinates.length === 0 ||
      !Array.isArray(annotation.geometry.coordinates[0]) ||
      typeof annotation.geometry.coordinates[0][0] !== 'number' ||
      typeof annotation.geometry.coordinates[0][1] !== 'number'
    ) {
      return;
    }

    const mapHeight = map.getCanvas().clientHeight;
    const polygonCoordinates = annotation.geometry.coordinates;

    const projectedCoordinates = map.project(polygonCoordinates[0] as [number, number]);

    const annotationY = projectedCoordinates.y;
    const annotationX = projectedCoordinates.x;

    // check if the annotation is in the lower third of the map
    const isInLowerThird = annotationY >= mapHeight / 2 - 100;

    // also check if the annotation is close to the top or bottom border of the map
    const isCloseToBorder =
      annotationY < 100 ||
      annotationY > mapHeight - 100 ||
      annotationX < 100 ||
      annotationX > map.getCanvas().width - 100;

    if (!isInLowerThird && !isCloseToBorder) return;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const polygonCenterX: number = polygonCoordinates[0][0] as number;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const polygonCenterY: number = polygonCoordinates[0][1] as number;

    map.flyTo({
      center: [polygonCenterX, polygonCenterY - 0.002_25],
      animate: true,
      duration: 1000,
    });
  }, [map, annotation]);
};
