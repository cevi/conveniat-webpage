import { useMap } from '@/features/map/components/maplibre-renderer/map-context-provider';
import type { GeolocateErrorEvent } from 'maplibre-gl';
import { GeolocateControl } from 'maplibre-gl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** Set on the map's container while the page draws its own locate button. */
export const OWN_LOCATE_BUTTON_CLASS = 'map-has-own-locate-button';

/**
 * - `searching` while the phone looks for its position, which can take seconds outdoors
 * - `active` while the map follows it
 * - `denied` when the user or the browser refused, `unavailable` when there is no fix or no GPS
 */
export type LocateState = 'idle' | 'searching' | 'active' | 'denied' | 'unavailable';

/**
 * Finding oneself on the map, from a button the page draws itself. MapLibre's control does the
 * work, the dot and the following, but its own button is hidden: it would sit apart from the
 * search, in the corner the search row takes. Its events become a state the button can show.
 */
export const useLocateControl = (): {
  locate: () => void;
  /** starts locating without a tap; `false` while the control is not ready yet */
  tryLocate: () => boolean;
  state: LocateState;
} => {
  const map = useMap();
  const control = useRef<GeolocateControl | undefined>(undefined);
  const [state, setState] = useState<LocateState>('idle');

  useEffect(() => {
    if (map === undefined) return;
    const geolocate = new GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    });
    geolocate.on('trackuserlocationstart', () => setState('searching'));
    geolocate.on('geolocate', () => setState('active'));
    geolocate.on('trackuserlocationend', () => setState('idle'));
    // code 1 is the Geolocation API's PERMISSION_DENIED
    geolocate.on('error', (event: GeolocateErrorEvent) =>
      setState(event.code === 1 ? 'denied' : 'unavailable'),
    );
    map.addControl(geolocate, 'top-right');
    map.getContainer().classList.add(OWN_LOCATE_BUTTON_CLASS);
    control.current = geolocate;
    return (): void => {
      map.getContainer().classList.remove(OWN_LOCATE_BUTTON_CLASS);
      if (map.hasControl(geolocate)) map.removeControl(geolocate);
      control.current = undefined;
    };
  }, [map]);

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState('unavailable');
      return;
    }
    // false while the control is not ready yet, e.g. before the map has loaded
    if (control.current?.trigger() !== true) setState('unavailable');
  }, []);

  const tryLocate = useCallback(
    (): boolean => 'geolocation' in navigator && control.current?.trigger() === true,
    [],
  );

  return { locate, tryLocate, state };
};

const LOCATE_PARAMETER = 'locate';

/** Tries this often, this far apart, while the map and its control are still setting up. */
const START_ATTEMPTS = 60;
const START_INTERVAL_MS = 250;

/**
 * Switches the user's position on once, when the page was opened with `?locate=1`, as "Weg
 * anzeigen" on a block does: the place is open, and the dot shows where one stands. The
 * parameter is taken out of the URL, so a reload does not ask for the position again.
 */
export const useLocateOnArrival = (locate: () => boolean): void => {
  // read once at mount, so the effect running twice in development still sees it
  const wasAsked = useMemo(
    () =>
      // eslint-disable-next-line unicorn/no-typeof-undefined -- `location` is not declared off a browser
      typeof globalThis.location !== 'undefined' &&
      new URL(globalThis.location.href).searchParams.get(LOCATE_PARAMETER) === '1',
    [],
  );

  useEffect(() => {
    if (!wasAsked) return;
    const url = new URL(globalThis.location.href);
    if (url.searchParams.has(LOCATE_PARAMETER)) {
      url.searchParams.delete(LOCATE_PARAMETER);
      globalThis.history.replaceState(globalThis.history.state, '', url.toString());
    }

    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (locate() || attempts >= START_ATTEMPTS) clearInterval(timer);
    }, START_INTERVAL_MS);
    return (): void => clearInterval(timer);
  }, [wasAsked, locate]);
};
