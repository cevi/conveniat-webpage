/**
 * @jest-environment jsdom
 */

import { MapContext } from '@/features/map/components/maplibre-renderer/map-context-provider';
import { useFlyToAnnotation } from '@/features/map/hooks/use-fly-to-annotation';
import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';
import {
  ANNOTATION_DRAWER_ATTRIBUTE,
  ANNOTATION_FOCUS_MARGINS,
} from '@/features/map/utils/annotation-focus';
import { renderHook } from '@testing-library/react';
import type maplibregl from 'maplibre-gl';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 700;
/** the drawer opens at 50vh and is aligned with the bottom of the map canvas */
const DRAWER_HEIGHT = 400;

interface FakeMapOptions {
  center: [number, number];
  zoom: number;
  bearing: number;
  drawerHeight?: number;
}

/**
 * Minimal stand-in for a MapLibre map.
 *
 * `project`/`unproject` implement the same linear, rotated screen transform MapLibre uses for an
 * unpitched map (the map is created with pitch disabled), which is what makes the fly-to
 * computation verifiable without WebGL.
 */
const createFakeMap = ({
  center,
  zoom,
  bearing,
  drawerHeight = DRAWER_HEIGHT,
}: FakeMapOptions): {
  map: maplibregl.Map;
  flyTo: jest.Mock;
  project: (coordinates: [number, number]) => { x: number; y: number };
  /** coordinate that currently projects onto the given canvas position */
  coordinatesAt: (point: { x: number; y: number }) => [number, number];
} => {
  const pixelsPerDegree = (256 * 2 ** zoom) / 360;
  const bearingInRadians = (bearing * Math.PI) / 180;
  const cosine = Math.cos(bearingInRadians);
  const sine = Math.sin(bearingInRadians);

  let currentCenter = center;

  // MapLibre accepts both tuples and `LngLat` objects
  const toWorld = (
    coordinates: [number, number] | { lng: number; lat: number },
  ): { x: number; y: number } => {
    const [longitude, latitude] = Array.isArray(coordinates)
      ? coordinates
      : [coordinates.lng, coordinates.lat];
    return { x: longitude * pixelsPerDegree, y: -latitude * pixelsPerDegree };
  };

  const project = (
    coordinates: [number, number] | { lng: number; lat: number },
  ): { x: number; y: number } => {
    const world = toWorld(coordinates);
    const worldCenter = toWorld(currentCenter);
    const deltaX = world.x - worldCenter.x;
    const deltaY = world.y - worldCenter.y;
    return {
      x: CANVAS_WIDTH / 2 + deltaX * cosine + deltaY * sine,
      y: CANVAS_HEIGHT / 2 - deltaX * sine + deltaY * cosine,
    };
  };

  const unproject = ([x, y]: [number, number]): { lng: number; lat: number } => {
    const screenX = x - CANVAS_WIDTH / 2;
    const screenY = y - CANVAS_HEIGHT / 2;
    const deltaX = screenX * cosine - screenY * sine;
    const deltaY = screenX * sine + screenY * cosine;
    const worldCenter = toWorld(currentCenter);
    return {
      lng: (worldCenter.x + deltaX) / pixelsPerDegree,
      lat: -(worldCenter.y + deltaY) / pixelsPerDegree,
    };
  };

  const stubRectangle = (element: Element, top: number, bottom: number): void => {
    element.getBoundingClientRect = (): DOMRect =>
      ({
        top,
        right: CANVAS_WIDTH,
        bottom,
        left: 0,
        width: CANVAS_WIDTH,
        height: bottom - top,
        x: 0,
        y: top,
      }) as DOMRect;
  };

  const wrapper = document.createElement('div');
  const container = document.createElement('div');
  const canvas = document.createElement('canvas');
  wrapper.append(container);
  container.append(canvas);
  document.body.append(wrapper);

  Object.defineProperty(canvas, 'clientWidth', { value: CANVAS_WIDTH });
  Object.defineProperty(canvas, 'clientHeight', { value: CANVAS_HEIGHT });
  stubRectangle(canvas, 0, CANVAS_HEIGHT);

  if (drawerHeight > 0) {
    const drawer = document.createElement('div');
    drawer.setAttribute(ANNOTATION_DRAWER_ATTRIBUTE, '');
    stubRectangle(drawer, CANVAS_HEIGHT - drawerHeight, CANVAS_HEIGHT);
    wrapper.append(drawer);
  }

  const flyTo = jest.fn(({ center: newCenter }: { center: { lng: number; lat: number } }) => {
    currentCenter = [newCenter.lng, newCenter.lat];
  });

  const map = {
    getCanvas: () => canvas,
    getContainer: () => container,
    getCenter: () => ({ lng: currentCenter[0], lat: currentCenter[1] }),
    project,
    unproject,
    flyTo,
  } as unknown as maplibregl.Map;

  const coordinatesAt = (point: { x: number; y: number }): [number, number] => {
    const { lng, lat } = unproject([point.x, point.y]);
    return [lng, lat];
  };

  return { map, flyTo, project, coordinatesAt };
};

const pointAnnotation = (coordinates: [number, number]): CampMapAnnotationPoint =>
  ({ id: 'annotation', title: 'Annotation', geometry: { coordinates } }) as CampMapAnnotationPoint;

const renderFlyToHook = (
  map: maplibregl.Map,
  annotation?: CampMapAnnotationPoint | CampMapAnnotationPolygon,
  enabled = true,
): void => {
  renderHook(() => useFlyToAnnotation(annotation, enabled), {
    wrapper: ({ children }) => <MapContext.Provider value={map}>{children}</MapContext.Provider>,
  });
};

/** the visible part of the map, i.e. everything the drawer does not cover */
const expectWithinVisibleRegion = (point: { x: number; y: number }): void => {
  const visibleHeight = CANVAS_HEIGHT - DRAWER_HEIGHT;
  expect(point.x).toBeGreaterThanOrEqual(ANNOTATION_FOCUS_MARGINS.left);
  expect(point.x).toBeLessThanOrEqual(CANVAS_WIDTH - ANNOTATION_FOCUS_MARGINS.right);
  expect(point.y).toBeGreaterThanOrEqual(ANNOTATION_FOCUS_MARGINS.top);
  expect(point.y).toBeLessThanOrEqual(visibleHeight - ANNOTATION_FOCUS_MARGINS.bottom);
};

describe('useFlyToAnnotation', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  // the previous implementation shifted the center by a fixed 0.00225°, which is only sensible at
  // one specific zoom level and for a north-up map — see issue #1444
  it.each([
    { zoom: 12, bearing: 0 },
    { zoom: 15, bearing: 0 },
    { zoom: 18, bearing: 0 },
    { zoom: 20, bearing: 0 },
    { zoom: 18, bearing: 90 },
    { zoom: 18, bearing: 180 },
    { zoom: 18, bearing: 233 },
  ])(
    'brings the annotation into the visible region at zoom $zoom / bearing $bearing',
    ({ zoom, bearing }) => {
      const center: [number, number] = [8.301_211, 46.502_822];
      const { map, flyTo, project } = createFakeMap({ center, zoom, bearing });
      // the annotation sits in the center of the canvas, i.e. behind the drawer
      const annotation = pointAnnotation(center);

      renderFlyToHook(map, annotation);

      expect(flyTo).toHaveBeenCalledTimes(1);
      expectWithinVisibleRegion(project(center));
    },
  );

  it('centers the annotation in the region left over by the drawer', () => {
    const center: [number, number] = [8.301_211, 46.502_822];
    const { map, project } = createFakeMap({ center, zoom: 17, bearing: 42 });

    renderFlyToHook(map, pointAnnotation(center));

    const projected = project(center);
    expect(projected.x).toBeCloseTo(CANVAS_WIDTH / 2, 5);
    // vertically centered within the visible strip, offset by the asymmetric margins
    const visibleHeight = CANVAS_HEIGHT - DRAWER_HEIGHT;
    const expectedY =
      (ANNOTATION_FOCUS_MARGINS.top + (visibleHeight - ANNOTATION_FOCUS_MARGINS.bottom)) / 2;
    expect(projected.y).toBeCloseTo(expectedY, 5);
  });

  it('does not move the map when the annotation is already visible', () => {
    const { map, flyTo, coordinatesAt } = createFakeMap({
      center: [8.301_211, 46.502_822],
      zoom: 18,
      bearing: 0,
    });
    // in the middle of the strip that stays visible next to the drawer
    const visible = coordinatesAt({ x: CANVAS_WIDTH / 2, y: (CANVAS_HEIGHT - DRAWER_HEIGHT) / 2 });

    renderFlyToHook(map, pointAnnotation(visible));

    expect(flyTo).not.toHaveBeenCalled();
  });

  it('moves annotations that are only hidden behind the drawer', () => {
    const { map, flyTo, project, coordinatesAt } = createFakeMap({
      center: [8.301_211, 46.502_822],
      zoom: 16,
      bearing: 0,
    });
    const hidden = coordinatesAt({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 50 });

    renderFlyToHook(map, pointAnnotation(hidden));

    expect(flyTo).toHaveBeenCalledTimes(1);
    expectWithinVisibleRegion(project(hidden));
  });

  it('uses the full canvas when no drawer is open', () => {
    const center: [number, number] = [8.301_211, 46.502_822];
    const { map, flyTo } = createFakeMap({ center, zoom: 18, bearing: 0, drawerHeight: 0 });

    renderFlyToHook(map, pointAnnotation(center));

    expect(flyTo).not.toHaveBeenCalled();
  });

  it('focuses the centroid of a polygon annotation', () => {
    const { map, flyTo, project } = createFakeMap({
      center: [8.3, 46.5],
      zoom: 18,
      bearing: 25,
    });
    // a square centered on the map center, i.e. its centroid is hidden behind the drawer
    const polygon = {
      id: 'polygon',
      title: 'Polygon',
      geometry: {
        coordinates: [
          [8.2995, 46.4995],
          [8.3005, 46.4995],
          [8.3005, 46.5005],
          [8.2995, 46.5005],
        ],
      },
    } as CampMapAnnotationPolygon;

    renderFlyToHook(map, polygon);

    expect(flyTo).toHaveBeenCalledTimes(1);
    expectWithinVisibleRegion(project([8.3, 46.5]));
  });

  it('does nothing when disabled or without an annotation', () => {
    const { map, flyTo } = createFakeMap({ center: [8.3, 46.5], zoom: 18, bearing: 0 });

    renderFlyToHook(map, pointAnnotation([8.3, 46.5]), false);
    renderFlyToHook(map);

    expect(flyTo).not.toHaveBeenCalled();
  });
});
