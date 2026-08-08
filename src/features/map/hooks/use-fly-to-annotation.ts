'use client';

import { useMap } from '@/features/map/components/maplibre-renderer/map-context-provider';
import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';
import {
  ANNOTATION_DRAWER_ATTRIBUTE,
  ANNOTATION_FOCUS_MARGINS,
  getAnnotationFocusCoordinates,
  getFocusTargetPoint,
  getObstructedBottomHeight,
  getRecenteredMapCenterPoint,
  getUnobstructedRegion,
  isAnnotationComfortablyVisible,
} from '@/features/map/utils/annotation-focus';
import type maplibregl from 'maplibre-gl';
import { useEffect } from 'react';

const FLY_TO_DURATION_IN_MS = 1000;

/**
 * Measures how much of the map canvas is covered by the annotation drawer.
 *
 * The drawer is a sibling of the map container and can be resized by the user, so its actual size
 * is read from the DOM instead of being assumed.
 *
 * @returns the covered height in CSS pixels, `0` if no drawer is open
 */
const measureDrawerObstruction = (map: maplibregl.Map): number => {
  const drawer = (map.getContainer().parentElement ?? document).querySelector(
    `[${ANNOTATION_DRAWER_ATTRIBUTE}]`,
  );
  if (!drawer) return 0;

  return getObstructedBottomHeight(
    map.getCanvas().getBoundingClientRect(),
    drawer.getBoundingClientRect(),
  );
};

/**
 * Moves the map so that the currently opened annotation is visible next to the annotation drawer.
 *
 * Nothing happens as long as the annotation already sits comfortably inside the part of the map
 * that the drawer does not cover — the map is only moved when the annotation would otherwise be
 * hidden or clipped.
 *
 * The animation target is computed in screen space and turned back into coordinates with the map's
 * own `unproject()`. That keeps the movement correct for every zoom level and bearing; a fixed
 * offset in degrees (as used previously) is only correct for one specific zoom level and for a
 * north-up map, and pushes the annotation off-screen otherwise.
 *
 * @param annotation the annotation whose details drawer is open
 * @param enabled set to `false` to disable the automatic movement entirely
 */
export const useFlyToAnnotation = (
  annotation: CampMapAnnotationPoint | CampMapAnnotationPolygon | undefined,
  enabled: boolean = true,
): void => {
  const map = useMap();

  useEffect(() => {
    if (!map || !annotation || !enabled) return;

    const coordinates = getAnnotationFocusCoordinates(annotation);
    if (!coordinates) return;

    const canvas = map.getCanvas();
    const canvasSize = { width: canvas.clientWidth, height: canvas.clientHeight };
    // the map has not been laid out (yet); there is nothing meaningful to center into
    if (canvasSize.width <= 0 || canvasSize.height <= 0) return;

    const unobstructedRegion = getUnobstructedRegion(canvasSize, measureDrawerObstruction(map));
    const annotationPoint = map.project(coordinates);

    if (
      isAnnotationComfortablyVisible(annotationPoint, unobstructedRegion, ANNOTATION_FOCUS_MARGINS)
    ) {
      return;
    }

    const targetPoint = getFocusTargetPoint(unobstructedRegion, ANNOTATION_FOCUS_MARGINS);
    const recenteredPoint = getRecenteredMapCenterPoint(
      map.project(map.getCenter()),
      annotationPoint,
      targetPoint,
    );

    map.flyTo({
      center: map.unproject([recenteredPoint.x, recenteredPoint.y]),
      animate: true,
      duration: FLY_TO_DURATION_IN_MS,
    });
  }, [map, annotation, enabled]);
};
