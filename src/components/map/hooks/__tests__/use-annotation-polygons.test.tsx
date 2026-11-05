/**
 * @jest-environment jsdom
 */

jest.mock('@/components/map/hooks/use-annotation-point-markers', () => ({ POINT_LAYER_IDS: [] }));

import { useAnnotationPolygons } from '@/components/map/hooks/use-annotation-polygons';
import { MapContextProvider } from '@/components/map/maplibre-renderer/map-context-provider';
import type { CampMapAnnotationPolygon } from '@/components/map/types';
import { renderHook } from '@testing-library/react';
import type { Map as MapLibre } from 'maplibre-gl';
import type React from 'react';

interface FakeSource {
  setData: jest.Mock;
  data: unknown;
}

/** The parts of a MapLibre map the areas are drawn with, recording what is on it. */
const fakeMap = (): {
  map: MapLibre;
  sources: Map<string, FakeSource>;
  layers: Set<string>;
  removed: jest.Mock;
  on: jest.Mock;
  off: jest.Mock;
} => {
  const sources = new Map<string, FakeSource>();
  const layers = new Set<string>();
  const removed = jest.fn();
  const on = jest.fn();
  const off = jest.fn();
  const map = {
    isStyleLoaded: (): boolean => true,
    hasImage: (): boolean => true,
    addImage: jest.fn(),
    getSource: (id: string): FakeSource | undefined => sources.get(id),
    addSource: (id: string, { data }: { data: unknown }): void => {
      const source: FakeSource = {
        data,
        setData: jest.fn((next: unknown) => {
          source.data = next;
          return Promise.resolve();
        }),
      };
      sources.set(id, source);
    },
    getLayer: (id: string): string | undefined => (layers.has(id) ? id : undefined),
    addLayer: ({ id }: { id: string }): void => {
      layers.add(id);
    },
    removeLayer: removed,
    removeSource: removed,
    getZoom: (): number => 15,
    setFilter: jest.fn(),
    on,
    off,
    once: jest.fn(),
    getCanvas: (): HTMLCanvasElement => document.createElement('canvas'),
  };
  return { map: map as unknown as MapLibre, sources, layers, removed, on, off };
};

const area = (title: string): CampMapAnnotationPolygon =>
  ({
    id: 'area-1',
    title,
    color: '#47564c',
    importance: 'high',
    isInteractive: true,
    geometry: {
      coordinates: [
        [8.3, 46.5],
        [8.31, 46.5],
        [8.31, 46.51],
      ],
    },
  }) as CampMapAnnotationPolygon;

const zoomListenersIn = (mock: jest.Mock): number =>
  mock.mock.calls.filter(([event]) => event === 'zoom').length;

const titlesIn = (source: FakeSource | undefined): unknown[] =>
  (source?.data as { features: { properties: { title: unknown } }[] }).features.map(
    (feature) => feature.properties.title,
  );

describe('useAnnotationPolygons', () => {
  it('updates the areas in place when they change, without redrawing them', () => {
    const { map, sources, removed } = fakeMap();
    const wrapper = ({ children }: { children: React.ReactNode }): React.ReactNode => (
      <MapContextProvider map={map}>{children}</MapContextProvider>
    );
    const { rerender } = renderHook(
      ({ areas }) => useAnnotationPolygons(areas, undefined, jest.fn()),
      { wrapper, initialProps: { areas: [area('Quartier 7')] } },
    );
    expect(titlesIn(sources.get('all-polygons-source'))).toEqual(['Quartier 7']);

    rerender({ areas: [area('Quartier 7 - Phoenix')] });

    expect(removed).not.toHaveBeenCalled();
    expect(titlesIn(sources.get('all-polygons-source'))).toEqual(['Quartier 7 - Phoenix']);
  });

  it('keeps one zoom listener however often the areas change', () => {
    const { map, on, off } = fakeMap();
    const wrapper = ({ children }: { children: React.ReactNode }): React.ReactNode => (
      <MapContextProvider map={map}>{children}</MapContextProvider>
    );
    const { rerender } = renderHook(
      ({ areas }) => useAnnotationPolygons(areas, undefined, jest.fn()),
      { wrapper, initialProps: { areas: [area('Q')] } },
    );
    rerender({ areas: [area('Qu')] });
    rerender({ areas: [area('Qua')] });

    expect(zoomListenersIn(on) - zoomListenersIn(off)).toBe(1);
  });

  it('leaves the areas on a map whose page is only hidden', () => {
    const { map, layers, removed } = fakeMap();
    const wrapper = ({ children }: { children: React.ReactNode }): React.ReactNode => (
      <MapContextProvider map={map}>{children}</MapContextProvider>
    );
    const { unmount } = renderHook(
      () => useAnnotationPolygons([area('Bühne')], undefined, jest.fn()),
      {
        wrapper,
      },
    );
    const drawn = new Set(layers);

    unmount();

    expect(removed).not.toHaveBeenCalled();
    expect(layers).toEqual(drawn);
  });
});
