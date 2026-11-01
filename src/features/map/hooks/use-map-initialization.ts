import type { InitialMapPose } from '@/features/map/types/types';
import { mapLibreLocaleOf } from '@/features/map/utils/maplibre-locale';
import { configureMapLibreWorker } from '@/lib/maplibre-worker';
import type { Locale } from '@/types/types';
import { AttributionControl, Map as MapLibre } from 'maplibre-gl';

import { useEffect, useState } from 'react';

const minZoomLevelForSwitzerland = 4;

const BASE_MAP_STYLE = '/vector-map/base_style.json';

/**
 * Maps whose page is hidden, by their container. Next.js drops a hidden page from its cache
 * after a few navigations without running any cleanup, so the map of a container that has left
 * the document is removed the next time any map initializes.
 */
const hiddenMaps = new Map<HTMLElement, MapLibre>();

const removeMapsOfRemovedContainers = (): void => {
  for (const [container, hiddenMap] of hiddenMaps) {
    if (container.isConnected) continue;
    hiddenMap.remove();
    hiddenMaps.delete(container);
  }
};

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
    /** the language of MapLibre's own labels */
    locale: Locale;
  },
): MapInitialization => {
  const [map, setMap] = useState<MapLibre | undefined>();
  const [initializationFailed, setInitializationFailed] = useState(false);
  const { initialMapPose, limitUsage, validateStyle, style = BASE_MAP_STYLE, locale } = options;

  useEffect(() => {
    if (!mapContainer) return;
    removeMapsOfRemovedContainers();

    let mapInstance = hiddenMaps.get(mapContainer);
    hiddenMaps.delete(mapContainer);
    // a map shown again still has the size of its last visible frame; MapLibre would measure the
    // page by itself only a moment later, and the picture jumps when it does
    if (mapInstance !== undefined && mapContainer.clientWidth > 0) mapInstance.resize();

    if (mapInstance === undefined) {
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
          locale: mapLibreLocaleOf(locale),
        });

        mapInstance.addControl(new AttributionControl({ compact: true }));
      } catch (error) {
        console.warn('Failed to initialize the map, rendering fallback instead:', error);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setInitializationFailed(true);
        return;
      }
    }

    const instance = mapInstance;
    setInitializationFailed(false);
    setMap(instance);

    return (): void => {
      // Next.js hides a page the user leaves with <Activity> and runs this cleanup, but keeps
      // its DOM. Removing the map here rebuilt it on every return to the Karte: a new WebGL
      // context, the style, every tile parsed again. A container still in the document is only
      // hidden, so the map waits for it; one taken out of the document is gone for good.
      if (mapContainer.isConnected) {
        hiddenMaps.set(mapContainer, instance);
        return;
      }
      instance.remove();
      setMap(undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapContainer]);

  return { map, initializationFailed };
};
