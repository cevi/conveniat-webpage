import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';
import type { ScreenRectangle } from '@/features/map/utils/annotation-focus';
import {
  ANNOTATION_FOCUS_MARGINS,
  getAnnotationFocusCoordinates,
  getFocusTargetPoint,
  getObstructedBottomHeight,
  getPolygonCentroid,
  getRecenteredMapCenterPoint,
  getUnobstructedRegion,
  isAnnotationComfortablyVisible,
} from '@/features/map/utils/annotation-focus';

const rectangle = (top: number, right: number, bottom: number, left: number): ScreenRectangle => ({
  top,
  right,
  bottom,
  left,
});

const noMargins = { top: 0, right: 0, bottom: 0, left: 0 };

describe('getObstructedBottomHeight', () => {
  const canvas = rectangle(60, 400, 700, 0);

  it('returns the height covered by a bottom sheet', () => {
    // drawer covering the lower 300px of the canvas
    expect(getObstructedBottomHeight(canvas, rectangle(400, 400, 700, 0))).toBe(300);
  });

  it('counts everything below the top edge of the sheet as covered', () => {
    // the drawer extends past the bottom of the canvas
    expect(getObstructedBottomHeight(canvas, rectangle(400, 400, 900, 0))).toBe(300);
  });

  it('clips the sheet to the canvas', () => {
    expect(getObstructedBottomHeight(canvas, rectangle(0, 400, 900, 0))).toBe(640);
  });

  it('ignores sheets that do not overlap the canvas', () => {
    expect(getObstructedBottomHeight(canvas, rectangle(700, 400, 900, 0))).toBe(0);
    expect(getObstructedBottomHeight(canvas, rectangle(0, 400, 60, 0))).toBe(0);
    // side panel, next to the canvas
    expect(getObstructedBottomHeight(canvas, rectangle(60, 0, 700, -480))).toBe(0);
  });
});

describe('getUnobstructedRegion', () => {
  it('cuts the obstructed height off the bottom', () => {
    expect(getUnobstructedRegion({ width: 400, height: 700 }, 300)).toEqual(
      rectangle(0, 400, 400, 0),
    );
  });

  it('never returns a negative region', () => {
    expect(getUnobstructedRegion({ width: 400, height: 700 }, 900)).toEqual(
      rectangle(0, 400, 0, 0),
    );
  });
});

describe('isAnnotationComfortablyVisible', () => {
  const region = rectangle(0, 400, 400, 0);

  it('accepts annotations inside the region', () => {
    expect(
      isAnnotationComfortablyVisible({ x: 200, y: 200 }, region, ANNOTATION_FOCUS_MARGINS),
    ).toBe(true);
  });

  it('rejects annotations hidden behind the drawer', () => {
    expect(
      isAnnotationComfortablyVisible({ x: 200, y: 550 }, region, ANNOTATION_FOCUS_MARGINS),
    ).toBe(false);
  });

  it('rejects annotations too close to an edge of the region', () => {
    // right above the drawer, but the marker would be clipped
    expect(
      isAnnotationComfortablyVisible({ x: 200, y: 380 }, region, ANNOTATION_FOCUS_MARGINS),
    ).toBe(false);
    // the marker icon extends upwards, so more headroom is required at the top
    expect(
      isAnnotationComfortablyVisible({ x: 200, y: 40 }, region, ANNOTATION_FOCUS_MARGINS),
    ).toBe(false);
    expect(
      isAnnotationComfortablyVisible({ x: 10, y: 200 }, region, ANNOTATION_FOCUS_MARGINS),
    ).toBe(false);
  });

  it('only accepts the center when the drawer leaves no room for the margins', () => {
    const tinyRegion = rectangle(0, 400, 20, 0);
    expect(
      isAnnotationComfortablyVisible({ x: 200, y: 10 }, tinyRegion, ANNOTATION_FOCUS_MARGINS),
    ).toBe(true);
    expect(
      isAnnotationComfortablyVisible({ x: 200, y: 18 }, tinyRegion, ANNOTATION_FOCUS_MARGINS),
    ).toBe(false);
  });
});

describe('getFocusTargetPoint', () => {
  it('targets the center of the region', () => {
    expect(getFocusTargetPoint(rectangle(0, 400, 400, 0), noMargins)).toEqual({ x: 200, y: 200 });
  });

  it('shifts the target down so that the marker icon is centered', () => {
    const target = getFocusTargetPoint(rectangle(0, 400, 400, 0), ANNOTATION_FOCUS_MARGINS);
    expect(target.x).toBe(200);
    expect(target.y).toBeGreaterThan(200);
  });

  it('falls back to the region center when the margins do not fit', () => {
    expect(getFocusTargetPoint(rectangle(0, 40, 20, 0), ANNOTATION_FOCUS_MARGINS)).toEqual({
      x: 20,
      y: 10,
    });
  });
});

describe('getRecenteredMapCenterPoint', () => {
  it('moves the center so that the annotation lands on the target', () => {
    const currentCenter = { x: 200, y: 350 };
    const annotation = { x: 120, y: 620 };
    const target = { x: 200, y: 180 };

    const newCenter = getRecenteredMapCenterPoint(currentCenter, annotation, target);

    // panning moves every point by the same vector
    const pan = { x: currentCenter.x - newCenter.x, y: currentCenter.y - newCenter.y };
    expect({ x: annotation.x + pan.x, y: annotation.y + pan.y }).toEqual(target);
  });

  it('leaves the center untouched when the annotation is already on the target', () => {
    expect(
      getRecenteredMapCenterPoint({ x: 200, y: 350 }, { x: 50, y: 50 }, { x: 50, y: 50 }),
    ).toEqual({ x: 200, y: 350 });
  });
});

describe('getPolygonCentroid', () => {
  it('computes the centroid of a square', () => {
    const centroid = getPolygonCentroid([
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
    ]);
    expect(centroid?.[0]).toBeCloseTo(1);
    expect(centroid?.[1]).toBeCloseTo(1);
  });

  it('is independent of the winding order', () => {
    const clockwise = getPolygonCentroid([
      [0, 0],
      [0, 2],
      [2, 2],
      [2, 0],
    ]);
    expect(clockwise?.[0]).toBeCloseTo(1);
    expect(clockwise?.[1]).toBeCloseTo(1);
  });

  it('falls back to the average vertex for degenerate rings', () => {
    expect(
      getPolygonCentroid([
        [0, 0],
        [2, 0],
        [4, 0],
      ]),
    ).toEqual([2, 0]);
  });

  it('returns undefined for empty rings', () => {
    expect(getPolygonCentroid([])).toBeUndefined();
  });
});

describe('getAnnotationFocusCoordinates', () => {
  it('returns the marker position of a point annotation', () => {
    const annotation = { geometry: { coordinates: [8.3, 46.5] } } as CampMapAnnotationPoint;
    expect(getAnnotationFocusCoordinates(annotation)).toEqual([8.3, 46.5]);
  });

  it('returns the centroid of a polygon annotation', () => {
    const annotation = {
      geometry: {
        coordinates: [
          [8, 46],
          [10, 46],
          [10, 48],
          [8, 48],
        ],
      },
    } as CampMapAnnotationPolygon;
    const coordinates = getAnnotationFocusCoordinates(annotation);
    expect(coordinates?.[0]).toBeCloseTo(9);
    expect(coordinates?.[1]).toBeCloseTo(47);
  });

  it('returns undefined for annotations without geometry', () => {
    expect(
      getAnnotationFocusCoordinates({
        geometry: { coordinates: [] },
      } as unknown as CampMapAnnotationPolygon),
    ).toBeUndefined();
  });
});
