import { useMap } from '@/features/map/components/maplibre-renderer/map-context-provider';
import type { MapControlOptions } from '@/features/map/types/types';
import type maplibregl from 'maplibre-gl';
import { GeolocateControl, NavigationControl, ScaleControl } from 'maplibre-gl';
import { useEffect } from 'react';

import '@/features/map/components/maplibre-renderer/style-overrides.css';

export const useMapControls = (options: MapControlOptions = {}): void => {
  const {
    showSearch = false, // Deprecated, search is now inline
    showNavigation = true,
    showGeolocate = true,
    showScale = true,
  } = options;

  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const controls: maplibregl.IControl[] = [];

    if (showSearch) {
      // Inline search is handled by SearchBar in map-renderer
    }

    if (showNavigation) {
      const navControl = new NavigationControl({ showZoom: false });
      map.addControl(navControl, 'top-right');
      controls.push(navControl);
    }

    if (showScale) {
      const scaleControl = new ScaleControl({ maxWidth: 120, unit: 'metric' });
      map.addControl(scaleControl, 'bottom-right');
      controls.push(scaleControl);
    }

    if (showGeolocate) {
      const geoControl = new GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      });
      map.addControl(geoControl, 'top-right');
      controls.push(geoControl);
    }

    return (): void => {
      for (const control of controls) {
        if (map.hasControl(control)) {
          map.removeControl(control);
        }
      }
    };
  }, [map, showSearch, showNavigation, showGeolocate, showScale]);
};
