import type { Map as MapLibre } from 'maplibre-gl';
import { GeolocateControl, NavigationControl, ScaleControl } from 'maplibre-gl';
import { useEffect } from 'react';

export function useMapControls(map: MapLibre | null) {
  useEffect(() => {
    if (!map) return;

    map.addControl(new NavigationControl());
    map.addControl(new ScaleControl({ maxWidth: 80, unit: 'metric' }));
    map.addControl(
      new GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
    );
  }, [map]);
}
