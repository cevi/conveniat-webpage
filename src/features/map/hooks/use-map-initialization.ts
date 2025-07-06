import type { InitialMapPose } from '@/features/map/types/types';
import { Map as MapLibre } from 'maplibre-gl';
import type React from 'react';
import { useEffect, useState } from 'react';

const minZoomLevelForSwitzerland = 4;

export const useMapInitialization = (
  mapContainerReference: React.RefObject<HTMLDivElement | null>,
  options: {
    initialMapPose: InitialMapPose;
    limitUsage: boolean;
    validateStyle: boolean;
  },
): MapLibre => {
  const [map, setMap] = useState<MapLibre | undefined>();
  const { initialMapPose, limitUsage, validateStyle } = options;

  useEffect(() => {
    if (!mapContainerReference.current || map) return;

    const mapInstance = new MapLibre({
      container: mapContainerReference.current,
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
    });

    setMap(mapInstance);

    // Cleanup function to run when the component unmounts
    return (): void => {
      mapInstance.remove();
      setMap(undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return map as MapLibre;
};
