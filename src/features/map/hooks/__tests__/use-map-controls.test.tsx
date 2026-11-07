/**
 * @jest-environment jsdom
 */

import { MapContext } from '@/features/map/components/maplibre-renderer/map-context-provider';
import { useMapControls } from '@/features/map/hooks/use-map-controls';
import { renderHook } from '@testing-library/react';
import type * as maplibregl from 'maplibre-gl';
import type React from 'react';

jest.mock('@/hooks/use-current-locale', () => ({ useCurrentLocale: (): string => 'de' }));
jest.mock('@/features/map/components/maplibre-renderer/style-overrides.css', () => ({}));

// MapLibre's bundle does not load under Jest. The stand-in keeps what the hook relies on: the
// compass is a button with MapLibre's class, labelled from the map's UI strings, whose own click
// listener turns the map north.
jest.mock('maplibre-gl', () => {
  class NavigationControl {
    _compass: HTMLButtonElement;
    _container: HTMLElement;

    constructor() {
      this._container = document.createElement('div');
      this._compass = document.createElement('button');
      this._compass.className = 'maplibregl-ctrl-compass';
      this._container.append(this._compass);
    }

    onAdd(map: maplibregl.Map): HTMLElement {
      const label = (map as unknown as { _getUIString: (key: string) => string })._getUIString(
        'NavigationControl.ResetBearing',
      );
      this._compass.title = label;
      this._compass.setAttribute('aria-label', label);
      this._compass.addEventListener('click', () => map.resetNorthPitch());
      return this._container;
    }

    onRemove(): void {
      this._container.remove();
    }
  }
  return { NavigationControl, GeolocateControl: class {}, ScaleControl: class {} };
});

const HOME_BEARING = -38;

type Listener = () => void;

/**
 * A map without WebGL: it keeps a bearing, eases to a new one at once, and fires `rotate` and
 * `rotateend` the way a finished animation does.
 */
const createFakeMap = (
  initialBearing: number,
): {
  map: maplibregl.Map;
  container: HTMLElement;
  setBearing: (bearing: number) => void;
} => {
  const container = document.createElement('div');
  document.body.append(container);
  const listeners = new Map<string, Set<Listener>>();
  const controls = new Set<maplibregl.IControl>();
  let bearing = initialBearing;

  const setBearing = (next: number): void => {
    bearing = next;
    for (const type of ['rotate', 'rotateend']) {
      for (const listener of listeners.get(type) ?? []) listener();
    }
  };

  const map = {
    getBearing: (): number => bearing,
    _getUIString: (key: string): string =>
      key === 'NavigationControl.ResetBearing' ? 'Karte nach Norden ausrichten' : key,
    on: (type: string, listener: Listener): void => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)?.add(listener);
    },
    off: (type: string, listener: Listener): void => {
      listeners.get(type)?.delete(listener);
    },
    rotateTo: (next: number): void => setBearing(next),
    resetNorthPitch: (): void => setBearing(0),
    addControl: (control: maplibregl.IControl): void => {
      container.append(control.onAdd(map as unknown as maplibregl.Map));
      controls.add(control);
    },
    hasControl: (control: maplibregl.IControl): boolean => controls.has(control),
    removeControl: (control: maplibregl.IControl): void => {
      control.onRemove(map as unknown as maplibregl.Map);
      controls.delete(control);
    },
  };

  return { map: map as unknown as maplibregl.Map, container, setBearing };
};

const renderControls = (
  map: maplibregl.Map,
  homeBearing: number,
): ReturnType<typeof renderHook> => {
  const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
    <MapContext.Provider value={map}>{children}</MapContext.Provider>
  );
  return renderHook(() => useMapControls({ homeBearing, showScale: false, showGeolocate: false }), {
    wrapper,
  });
};

const compassOf = (container: HTMLElement): HTMLButtonElement => {
  const compass = container.querySelector<HTMLButtonElement>('.maplibregl-ctrl-compass');
  if (compass === null) throw new Error('no compass on the map');
  return compass;
};

describe('the compass on a map that starts turned', () => {
  it('turns the map north first, then back to where it started', () => {
    const { map, container } = createFakeMap(HOME_BEARING);
    renderControls(map, HOME_BEARING);
    const compass = compassOf(container);

    compass.click();
    expect(map.getBearing()).toBe(0);

    compass.click();
    expect(map.getBearing()).toBe(HOME_BEARING);
  });

  it('says what the next tap does', () => {
    const { map, container, setBearing } = createFakeMap(HOME_BEARING);
    renderControls(map, HOME_BEARING);
    const compass = compassOf(container);
    expect(compass.getAttribute('aria-label')).toBe('Karte nach Norden ausrichten');

    setBearing(0);
    expect(compass.getAttribute('aria-label')).toBe('Karte in die Grundausrichtung drehen');
    expect(compass.title).toBe('Karte in die Grundausrichtung drehen');

    setBearing(12);
    expect(compass.getAttribute('aria-label')).toBe('Karte nach Norden ausrichten');
  });

  it('only turns north on a map whose home is north', () => {
    const { map, container } = createFakeMap(0);
    renderControls(map, 0);
    const compass = compassOf(container);

    compass.click();
    expect(map.getBearing()).toBe(0);
    expect(compass.getAttribute('aria-label')).toBe('Karte nach Norden ausrichten');
  });
});
