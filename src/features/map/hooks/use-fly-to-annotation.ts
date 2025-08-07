'use client';

import { useMap } from '@/features/map/components/maplibre-renderer/map-context-provider';
import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';
import { useEffect } from 'react';

// Helper function to calculate the centroid of a polygon
const getPolygonCentroid = (coordinates: [number, number][]): [number, number] => {
  let area = 0;
  let centroidX = 0;
  let centroidY = 0;

  if (coordinates.length < 3) {
    throw new Error('Polygon must have at least 3 points');
  }

  for (let index = 0; index < coordinates.length; index++) {
    const coordinatesAtIndex = coordinates[index] as [number, number];
    if (!Array.isArray(coordinatesAtIndex)) {
      throw new TypeError('Invalid coordinates format');
    }

    const coordinatesAtNextIndex = coordinates[(index + 1) % coordinates.length] as [
      number,
      number,
    ];
    if (!Array.isArray(coordinatesAtNextIndex)) {
      throw new TypeError('Invalid coordinates format');
    }

    const x0 = coordinatesAtIndex[0];
    const y0 = coordinatesAtIndex[1];
    const x1 = coordinatesAtNextIndex[0];
    const y1 = coordinatesAtNextIndex[1];

    const a = x0 * y1 - x1 * y0;
    area += a;
    centroidX += (x0 + x1) * a;
    centroidY += (y0 + y1) * a;
  }

  area *= 0.5;
  if (area === 0) {
    throw new Error('Polygon area cannot be zero');
  }

  centroidX /= 6 * area;
  centroidY /= 6 * area;

  // Return the centroid coordinates
  return [centroidX, centroidY];
};

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
    const centroid = getPolygonCentroid(polygonCoordinates as [number, number][]);

    const projectedCoordinates = map.project(centroid as [number, number]);

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
      center: [centroid[0], centroid[1] - 0.002_25], // Use the calculated centroid
      animate: true,
      duration: 1000,
    });
  }, [map, annotation]);
};
