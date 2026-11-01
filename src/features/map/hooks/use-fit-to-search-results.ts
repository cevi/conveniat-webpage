'use client';

import { useMap } from '@/features/map/components/maplibre-renderer/map-context-provider';
import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';
import { LngLatBounds } from 'maplibre-gl';
import { useEffect } from 'react';

/** waits for a pause in typing, so the map does not jump with every letter */
const SETTLE_MS = 350;
/** a single place is shown close enough to read its name, no closer */
const MAX_ZOOM = 17;
/** the search row covers the top of the map */
const PADDING = { top: 80, bottom: 40, left: 40, right: 40 };

/** every corner of a place: a polygon's outline, a point's position */
const cornersOf = (
  annotation: CampMapAnnotationPoint | CampMapAnnotationPolygon,
): [number, number][] => {
  if (!('coordinates' in annotation.geometry)) return [];
  const { coordinates } = annotation.geometry as { coordinates: unknown };
  if (!Array.isArray(coordinates) || coordinates.length === 0) return [];
  if (typeof coordinates[0] === 'number') return [coordinates as [number, number]];
  return coordinates as [number, number][];
};

/**
 * Moves the map to what a search found: the place itself when there is one, all of them when
 * there are several. Filtering alone left a match off-screen, so nothing seemed to happen.
 */
export const useFitToSearchResults = (
  searchTerm: string,
  results: readonly (CampMapAnnotationPoint | CampMapAnnotationPolygon)[],
): void => {
  const map = useMap();

  useEffect(() => {
    if (map === undefined || searchTerm.trim() === '') return;
    const coordinates = results.flatMap((annotation) => cornersOf(annotation));
    const [first] = coordinates;
    if (first === undefined) return;

    const timer = setTimeout(() => {
      const bounds = coordinates.reduce(
        (sum, point) => sum.extend(point),
        new LngLatBounds(first, first),
      );
      const reduceMotion = globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
      map.fitBounds(bounds, {
        padding: PADDING,
        maxZoom: MAX_ZOOM,
        duration: reduceMotion ? 0 : 400,
      });
    }, SETTLE_MS);
    return (): void => clearTimeout(timer);
  }, [map, searchTerm, results]);
};
