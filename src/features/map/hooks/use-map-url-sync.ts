import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';
import { useQueryState } from '@/hooks/use-query-state';
import { useCallback } from 'react';

export const useMapUrlSync = (
  openAnnotation: CampMapAnnotationPoint | CampMapAnnotationPolygon | undefined,
  setOpenAnnotation: (anno: CampMapAnnotationPoint | CampMapAnnotationPolygon | undefined) => void,
  closeDrawer: () => void,
  points: CampMapAnnotationPoint[],
  polygons: CampMapAnnotationPolygon[],
  enabled: boolean = true,
): void => {
  const handleQueryChange = useCallback(
    (newValue: string | undefined): void => {
      if (newValue === undefined || newValue === '') {
        closeDrawer();
      } else {
        const foundAnnotation =
          points.find((a) => a.id === newValue) ?? polygons.find((a) => a.id === newValue);
        if (foundAnnotation) {
          setOpenAnnotation(foundAnnotation);
        }
      }
    },
    [closeDrawer, points, polygons, setOpenAnnotation],
  );

  useQueryState('locationId', openAnnotation?.id, handleQueryChange, enabled);
};
