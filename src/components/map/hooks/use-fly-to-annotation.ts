'use client';

import { useMap } from '@/components/map/maplibre-renderer/map-context-provider';
import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/components/map/types';
import {
  ANNOTATION_DRAWER_ATTRIBUTE,
  ANNOTATION_FOCUS_MARGINS,
  getAnnotationFocusCoordinates,
  getFocusTargetPoint,
  getObstructedBottomHeight,
  getRecenteredMapCenterPoint,
  getUnobstructedRegion,
  isAnnotationComfortablyVisible,
} from '@/components/map/utils/annotation-focus';
import type * as maplibregl from 'maplibre-gl';
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

    /** Moves the map, once it has a size. Returns whether it could tell where to. */
    const focus = (): boolean => {
      const container = map.getContainer();
      // the page is hidden or not laid out yet; there is nothing meaningful to center into
      if (container.clientWidth <= 0 || container.clientHeight <= 0) return false;

      // A kept map shown again still has the size of its last visible frame until MapLibre
      // measures the page, a moment after this effect. Computed against that size, the flight
      // ends with the place where the drawer covers it.
      const canvas = map.getCanvas();
      if (
        canvas.clientWidth !== container.clientWidth ||
        canvas.clientHeight !== container.clientHeight
      ) {
        map.resize();
      }
      const canvasSize = { width: canvas.clientWidth, height: canvas.clientHeight };

      const unobstructedRegion = getUnobstructedRegion(canvasSize, measureDrawerObstruction(map));
      const annotationPoint = map.project(coordinates);

      if (
        isAnnotationComfortablyVisible(
          annotationPoint,
          unobstructedRegion,
          ANNOTATION_FOCUS_MARGINS,
        )
      ) {
        return true;
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
      return true;
    };

    if (focus()) return;

    // A kept map whose page is still hidden can get the place it is asked to show before its page
    // is back, with no size to measure. It flies once MapLibre has measured the page again.
    const focusOnceLaidOut = (): void => {
      if (focus()) map.off('resize', focusOnceLaidOut);
    };
    map.on('resize', focusOnceLaidOut);
    return (): void => {
      map.off('resize', focusOnceLaidOut);
    };
  }, [map, annotation, enabled]);
};
