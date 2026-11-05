import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';
import { distanceInMetres } from '@/lib/forum-shared';

export interface NearbyAnnotation {
  id: string;
  title: string;
  distanceMetres: number;
}

const pointOf = ([longitude, latitude]: [number, number]): {
  longitude: number;
  latitude: number;
} => ({ longitude, latitude });

/** Whether a point lies inside a polygon's ring, by ray casting. */
const isInside = (point: [number, number], ring: [number, number][]): boolean => {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [x1, y1] = ring[index] ?? [0, 0];
    const [x2, y2] = ring[previous] ?? [0, 0];
    const crosses =
      y1 > point[1] !== y2 > point[1] &&
      point[0] < ((x2 - x1) * (point[1] - y1)) / (y2 - y1 || Number.EPSILON) + x1;
    if (crosses) inside = !inside;
  }
  return inside;
};

/**
 * The map entry a spot belongs to: the area it lies in, else the closest marker within
 * `maxMetres`. A report about a spot names it, so the Zentrale reads "Toitoi-Reihe Quartier 3"
 * instead of coordinates.
 */
export const findNearestAnnotation = (
  spot: [number, number],
  points: readonly CampMapAnnotationPoint[],
  polygons: readonly CampMapAnnotationPolygon[],
  maxMetres = 40,
): NearbyAnnotation | undefined => {
  let best: NearbyAnnotation | undefined;
  for (const point of points) {
    const distance = distanceInMetres(pointOf(spot), pointOf(point.geometry.coordinates));
    if (distance <= maxMetres && (best === undefined || distance < best.distanceMetres)) {
      best = { id: point.id, title: point.title, distanceMetres: Math.round(distance) };
    }
  }
  if (best !== undefined) return best;
  const area = polygons.find((polygon) => isInside(spot, polygon.geometry.coordinates));
  return area === undefined ? undefined : { id: area.id, title: area.title, distanceMetres: 0 };
};

/** Where the composer opens with a spot, and the map entry it belongs to if any. */
export const composerHrefFor = (
  spot: [number, number],
  annotation: { id: string; title: string } | undefined,
  topicId?: string | null,
): string => {
  const parameters = new URLSearchParams({
    lng: spot[0].toFixed(6),
    lat: spot[1].toFixed(6),
  });
  if (annotation !== undefined) {
    parameters.set('annotation', annotation.id);
    parameters.set('label', annotation.title);
  }
  if (topicId !== undefined && topicId !== null) parameters.set('topic', topicId);
  return `/app/forum/new?${parameters.toString()}`;
};
