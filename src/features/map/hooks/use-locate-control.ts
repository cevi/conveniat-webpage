import { useMap } from '@/features/map/components/maplibre-renderer/map-context-provider';
import { GeolocateControl } from 'maplibre-gl';
import { useCallback, useEffect, useRef } from 'react';

/** Set on the map's container while the page draws its own locate button. */
export const OWN_LOCATE_BUTTON_CLASS = 'map-has-own-locate-button';

/**
 * Finding oneself on the map, from a button the page draws itself. MapLibre's control does the
 * work, the dot and the following, but its own button is hidden: it would sit apart from the
 * search, in the corner the search row takes.
 */
export const useLocateControl = (): (() => void) => {
  const map = useMap();
  const control = useRef<GeolocateControl | undefined>(undefined);

  useEffect(() => {
    if (map === undefined) return;
    const geolocate = new GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    });
    map.addControl(geolocate, 'top-right');
    map.getContainer().classList.add(OWN_LOCATE_BUTTON_CLASS);
    control.current = geolocate;
    return (): void => {
      map.getContainer().classList.remove(OWN_LOCATE_BUTTON_CLASS);
      if (map.hasControl(geolocate)) map.removeControl(geolocate);
      control.current = undefined;
    };
  }, [map]);

  return useCallback(() => {
    control.current?.trigger();
  }, []);
};
