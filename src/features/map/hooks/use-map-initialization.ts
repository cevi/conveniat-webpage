import type { InitialMapPose } from '@/features/map/types/types';
import { AttributionControl, Map as MapLibre } from 'maplibre-gl';

import { useEffect, useState } from 'react';

const minZoomLevelForSwitzerland = 4;

export const useMapInitialization = (
  mapContainer: HTMLElement | null | undefined,
  options: {
    initialMapPose: InitialMapPose;
    limitUsage: boolean;
    validateStyle: boolean;
  },
): MapLibre => {
  const [map, setMap] = useState<MapLibre | undefined>();
  const { initialMapPose, limitUsage, validateStyle } = options;

  useEffect(() => {
    if (!mapContainer || map) return;

    const mapInstance = new MapLibre({
      container: mapContainer,
      validateStyle,
      style: '/vector-map/base_style.json',
      ...(!limitUsage && {
        cooperativeGestures: true,
        touchZoomRotate: false,
      }),
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      center: initialMapPose.initialMapCenter,
      zoom: initialMapPose.zoom,
      minZoom: minZoomLevelForSwitzerland,
      attributionControl: false,
    });

    mapInstance.addControl(new AttributionControl({ compact: true }));

    setMap(mapInstance);

    // Cleanup function to run when the component unmounts
    return (): void => {
      mapInstance.remove();
      setMap(undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapContainer]);

  return map as MapLibre;
};
