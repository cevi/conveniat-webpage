import { useMap } from '@/features/map/components/maplibre-renderer/map-context-provider';
import { GeolocateControl, NavigationControl, ScaleControl } from 'maplibre-gl';
import { useEffect } from 'react';

export const useMapControls = (): void => {
  const map = useMap();

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
};
