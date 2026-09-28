import type { InitialMapPose } from '@/features/map/types/types';
import { addPaperImage, PAPER_IMAGE_ID } from '@/features/map/utils/camp-map-images';
import { configureMapLibreWorker } from '@/lib/maplibre-worker';
import { AttributionControl, Map as MapLibre } from 'maplibre-gl';

import { useEffect, useState } from 'react';

const minZoomLevelForSwitzerland = 4;

const BASE_MAP_STYLE = '/vector-map/base_style.json';

export interface MapInitialization {
  /** The MapLibre instance, or `undefined` while initializing or after a failure. */
  map: MapLibre | undefined;
  /**
   * Set once the map could not be created on this device (e.g. no WebGL context).
   * Callers must render a fallback instead of the map when this is `true`.
   */
  initializationFailed: boolean;
}

/**
 * Creates the MapLibre instance for the given container.
 *
 * MapLibre throws synchronously from its constructor when no WebGL context can be
 * acquired (hardware acceleration disabled, blocked/sandboxed GPU, restricted
 * WebViews). That exception is not caught here by React and would tear down the
 * whole page through the nearest error boundary — including the emergency chat,
 * which always renders a location message. We therefore swallow the failure and
 * report it back so the caller can degrade gracefully.
 *
 * @param mapContainer the DOM node the map is rendered into
 * @param options initial pose and usage restrictions of the map
 * @returns the map instance and whether initialization failed
 */
export const useMapInitialization = (
  mapContainer: HTMLElement | null | undefined,
  options: {
    initialMapPose: InitialMapPose;
    limitUsage: boolean;
    validateStyle: boolean;
    /** URL of the MapLibre style, the swisstopo base map by default. */
    style?: string;
  },
): MapInitialization => {
  const [map, setMap] = useState<MapLibre | undefined>();
  const [initializationFailed, setInitializationFailed] = useState(false);
  const { initialMapPose, limitUsage, validateStyle, style = BASE_MAP_STYLE } = options;

  useEffect(() => {
    if (!mapContainer || map) return;

    let mapInstance: MapLibre;

    try {
      configureMapLibreWorker();
      mapInstance = new MapLibre({
        container: mapContainer,
        validateStyle,
        style,
        ...(!limitUsage && {
          cooperativeGestures: true,
          touchZoomRotate: false,
        }),
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        center: initialMapPose.initialMapCenter,
        zoom: initialMapPose.zoom,
        bearing: initialMapPose.bearing ?? 0,
        minZoom: minZoomLevelForSwitzerland,
        attributionControl: false,
      });

      mapInstance.addControl(new AttributionControl({ compact: true }));
      // the camp style paints its background with a texture drawn at runtime
      mapInstance.on('styleimagemissing', ({ id }) => {
        if (id === PAPER_IMAGE_ID) addPaperImage(mapInstance);
      });
    } catch (error) {
      console.warn('Failed to initialize the map, rendering fallback instead:', error);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInitializationFailed(true);
      return;
    }

    setInitializationFailed(false);
    setMap(mapInstance);

    // Cleanup function to run when the component unmounts
    return (): void => {
      mapInstance.remove();
      setMap(undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapContainer]);

  return { map, initializationFailed };
};
