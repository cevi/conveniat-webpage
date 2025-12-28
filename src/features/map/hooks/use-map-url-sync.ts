import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';
import { useEffect } from 'react';

export const useMapUrlSync = (
  openAnnotation: CampMapAnnotationPoint | CampMapAnnotationPolygon | undefined,
  setOpenAnnotation: (anno: CampMapAnnotationPoint | CampMapAnnotationPolygon) => void,
  closeDrawer: () => void,
  points: CampMapAnnotationPoint[],
  polygons: CampMapAnnotationPolygon[],
  enabled: boolean = true,
): void => {
  // Effect 1: Read initial annotation ID from URL on mount
  useEffect(() => {
    if (!enabled) return;

    const annotationId = new URL(globalThis.location.href).searchParams.get('locationId');
    if (annotationId) {
      const initialAnnotation =
        points.find((a) => a.id === annotationId) ?? polygons.find((a) => a.id === annotationId);
      if (initialAnnotation) {
        setOpenAnnotation(initialAnnotation);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, polygons, enabled]); // Only run once with the initial data (and if enabled)

  // Effect 2: Sync openAnnotation state to URL
  useEffect(() => {
    if (!enabled) return;

    const url = new URL(globalThis.location.href);
    if (openAnnotation) {
      url.searchParams.set('locationId', openAnnotation.id);
    } else {
      url.searchParams.delete('locationId');
    }
    globalThis.history.pushState({}, '', url.toString());
  }, [openAnnotation, enabled]);

  // Effect 3: Handle browser back/forward navigation
  useEffect(() => {
    if (!enabled) return;

    const handlePopState = (): void => {
      const annotationId = new URL(globalThis.location.href).searchParams.get('locationId');
      if (!annotationId) {
        closeDrawer();
      }
    };

    globalThis.addEventListener('popstate', handlePopState);
    return (): void => globalThis.removeEventListener('popstate', handlePopState);
  }, [closeDrawer, enabled]);
};
