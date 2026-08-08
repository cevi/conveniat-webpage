import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';

/**
 * A point on the map canvas, in CSS pixels relative to its top-left corner.
 * This is what `map.project()` returns and what `map.unproject()` consumes.
 */
export interface ScreenPoint {
  x: number;
  y: number;
}

/** An axis aligned rectangle in CSS pixels. */
export interface ScreenRectangle {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Distances (in CSS pixels) that are kept free along the edges of a region. */
export interface EdgeMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Marks the annotation drawer in the DOM so that the fly-to logic can measure how much of the map
 * canvas it covers.
 */
export const ANNOTATION_DRAWER_ATTRIBUTE = 'data-annotation-drawer';

/**
 * Space that has to stay free around an annotation for it to count as "comfortably visible".
 *
 * Markers are anchored at their bottom tip and their icon extends roughly 72px upwards,
 * hence considerably more headroom is required above the projected coordinate than below it.
 */
export const ANNOTATION_FOCUS_MARGINS: EdgeMargins = {
  top: 88,
  right: 56,
  bottom: 56,
  left: 56,
};

/**
 * Height (in CSS pixels) of the map canvas that is hidden behind a bottom sheet such as the
 * annotation drawer.
 *
 * The obstacle is treated as covering everything below its top edge — bottom sheets are anchored
 * to the bottom of the map, so anything below them is either the sheet itself or a sliver that is
 * not worth focussing into.
 *
 * @param canvas bounding rectangle of the map canvas
 * @param obstacle bounding rectangle of the overlapping element
 * @returns the obstructed height, `0` if the obstacle does not overlap the canvas
 */
export const getObstructedBottomHeight = (
  canvas: ScreenRectangle,
  obstacle: ScreenRectangle,
): number => {
  const horizontalOverlap =
    Math.min(canvas.right, obstacle.right) - Math.max(canvas.left, obstacle.left);
  if (horizontalOverlap <= 0) return 0;

  // the obstacle sits completely below or above the canvas
  if (obstacle.top >= canvas.bottom || obstacle.bottom <= canvas.top) return 0;

  return Math.max(0, canvas.bottom - Math.max(canvas.top, obstacle.top));
};

/**
 * The part of the map canvas that is not covered by a bottom sheet.
 *
 * @param canvasSize size of the map canvas in CSS pixels
 * @param obstructedBottomHeight height covered by the bottom sheet, see {@link getObstructedBottomHeight}
 * @returns the unobstructed region, in canvas coordinates
 */
export const getUnobstructedRegion = (
  canvasSize: { width: number; height: number },
  obstructedBottomHeight: number,
): ScreenRectangle => ({
  top: 0,
  right: canvasSize.width,
  bottom: Math.max(0, canvasSize.height - Math.max(0, obstructedBottomHeight)),
  left: 0,
});

/**
 * Shrinks a region by the given margins. If the region is too small for the margins, it collapses
 * to its center along that axis instead of inverting.
 */
const insetRegion = (region: ScreenRectangle, margins: EdgeMargins): ScreenRectangle => {
  const horizontalCenter = (region.left + region.right) / 2;
  const verticalCenter = (region.top + region.bottom) / 2;

  const left = region.left + margins.left;
  const right = region.right - margins.right;
  const top = region.top + margins.top;
  const bottom = region.bottom - margins.bottom;

  const fitsHorizontally = left <= right;
  const fitsVertically = top <= bottom;

  return {
    top: fitsVertically ? top : verticalCenter,
    right: fitsHorizontally ? right : horizontalCenter,
    bottom: fitsVertically ? bottom : verticalCenter,
    left: fitsHorizontally ? left : horizontalCenter,
  };
};

/**
 * Whether the annotation is visible within the unobstructed region without sitting right on one of
 * its edges. Only annotations failing this check need to be flown to.
 *
 * @param annotationPoint projected position of the annotation on the canvas
 * @param region the unobstructed region of the canvas
 * @param margins space that has to stay free along the edges of the region
 */
export const isAnnotationComfortablyVisible = (
  annotationPoint: ScreenPoint,
  region: ScreenRectangle,
  margins: EdgeMargins,
): boolean => {
  const usableRegion = insetRegion(region, margins);
  return (
    annotationPoint.x >= usableRegion.left &&
    annotationPoint.x <= usableRegion.right &&
    annotationPoint.y >= usableRegion.top &&
    annotationPoint.y <= usableRegion.bottom
  );
};

/**
 * Position on the canvas an annotation should be moved to, i.e. the center of the unobstructed
 * region. The asymmetric margins push the target slightly downwards so that the marker icon —
 * which extends upwards from its anchor — ends up centered rather than the anchor point itself.
 */
export const getFocusTargetPoint = (region: ScreenRectangle, margins: EdgeMargins): ScreenPoint => {
  const usableRegion = insetRegion(region, margins);
  return {
    x: (usableRegion.left + usableRegion.right) / 2,
    y: (usableRegion.top + usableRegion.bottom) / 2,
  };
};

/**
 * Canvas position the map center has to be moved to so that `annotationPoint` ends up at
 * `targetPoint`.
 *
 * Panning the map moves every point on the canvas by the same vector, therefore moving the center
 * by `targetPoint - annotationPoint` moves the annotation onto the target. The result is expressed
 * as a canvas position so that the caller can turn it into geographic coordinates with the map's
 * own `unproject()`, which makes the computation correct for every zoom level and bearing.
 *
 * @param currentCenterPoint projected position of the current map center
 * @param annotationPoint projected position of the annotation
 * @param targetPoint position the annotation should end up at
 */
export const getRecenteredMapCenterPoint = (
  currentCenterPoint: ScreenPoint,
  annotationPoint: ScreenPoint,
  targetPoint: ScreenPoint,
): ScreenPoint => ({
  x: currentCenterPoint.x + annotationPoint.x - targetPoint.x,
  y: currentCenterPoint.y + annotationPoint.y - targetPoint.y,
});

/**
 * Centroid of a polygon ring, computed with the shoelace formula.
 *
 * Degenerate rings (all points on a line, duplicated points, …) have an area of zero and no
 * shoelace centroid; the average of the vertices is used for those.
 *
 * @param coordinates the ring as `[longitude, latitude]` pairs
 * @returns the centroid, or `undefined` if the ring is empty
 */
export const getPolygonCentroid = (
  coordinates: [number, number][],
): [number, number] | undefined => {
  const ring = coordinates.filter(
    (coordinate) =>
      Array.isArray(coordinate) &&
      typeof coordinate[0] === 'number' &&
      typeof coordinate[1] === 'number',
  );
  if (ring.length === 0) return undefined;

  let area = 0;
  let centroidX = 0;
  let centroidY = 0;

  for (let index = 0; index < ring.length; index++) {
    const [x0, y0] = ring[index] as [number, number];
    const [x1, y1] = ring[(index + 1) % ring.length] as [number, number];

    const crossProduct = x0 * y1 - x1 * y0;
    area += crossProduct;
    centroidX += (x0 + x1) * crossProduct;
    centroidY += (y0 + y1) * crossProduct;
  }

  area *= 0.5;

  if (area === 0) {
    const sumX = ring.reduce((sum, coordinate) => sum + coordinate[0], 0);
    const sumY = ring.reduce((sum, coordinate) => sum + coordinate[1], 0);
    return [sumX / ring.length, sumY / ring.length];
  }

  return [centroidX / (6 * area), centroidY / (6 * area)];
};

/**
 * The coordinate the map should focus on for the given annotation: the marker position for points
 * and the centroid for polygons.
 *
 * @returns the coordinate, or `undefined` if the annotation has no usable geometry
 */
export const getAnnotationFocusCoordinates = (
  annotation: CampMapAnnotationPoint | CampMapAnnotationPolygon,
): [number, number] | undefined => {
  if (!('coordinates' in annotation.geometry)) return undefined;

  const { coordinates } = annotation.geometry;
  if (!Array.isArray(coordinates) || coordinates.length === 0) return undefined;

  // point annotation: [longitude, latitude]
  if (typeof coordinates[0] === 'number') {
    const [longitude, latitude] = coordinates as [number, number];
    return typeof latitude === 'number' ? [longitude, latitude] : undefined;
  }

  // polygon annotation: [[longitude, latitude], …]
  return getPolygonCentroid(coordinates as [number, number][]);
};
