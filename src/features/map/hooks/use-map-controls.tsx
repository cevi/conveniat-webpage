import { useMap } from '@/features/map/components/maplibre-renderer/map-context-provider';
import type { MapControlOptions } from '@/features/map/types/types';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import type * as maplibregl from 'maplibre-gl';
import { GeolocateControl, NavigationControl, ScaleControl } from 'maplibre-gl';
import { useEffect } from 'react';

import '@/features/map/components/maplibre-renderer/style-overrides.css';

const turnHomeLabel: StaticTranslationString = {
  de: 'Karte in die Grundausrichtung drehen',
  en: 'Turn the map back to its default orientation',
  fr: 'Remettre la carte dans son orientation de base',
};

/** below this many degrees off north, the map counts as pointing north */
const NORTH_TOLERANCE_DEGREES = 0.5;

/**
 * MapLibre's compass only turns the map north, and does nothing once it points there. On a map
 * that starts turned, along the valley of the Lagerplatz, that second tap turns it back to where
 * it started, and the compass's label says which of the two a tap does.
 */
const turnHomeFromNorth = (
  map: maplibregl.Map,
  compass: HTMLButtonElement,
  homeBearing: number,
  homeLabel: string,
): (() => void) => {
  const northLabel = compass.title;
  const pointsNorth = (): boolean => Math.abs(map.getBearing()) < NORTH_TOLERANCE_DEGREES;

  const updateLabel = (): void => {
    const label = pointsNorth() ? homeLabel : northLabel;
    compass.title = label;
    compass.setAttribute('aria-label', label);
  };

  // MapLibre listens on the button itself; a capturing listener there runs first and keeps
  // MapLibre's from turning a map north that already is
  const onClick = (event: MouseEvent): void => {
    if (!pointsNorth()) return;
    event.stopImmediatePropagation();
    map.rotateTo(homeBearing);
  };

  compass.addEventListener('click', onClick, { capture: true });
  map.on('rotateend', updateLabel);
  updateLabel();

  return (): void => {
    compass.removeEventListener('click', onClick, { capture: true });
    map.off('rotateend', updateLabel);
  };
};

export const useMapControls = (options: MapControlOptions = {}): void => {
  const {
    showSearch = false, // Deprecated, search is now inline
    showNavigation = true,
    showGeolocate = true,
    showScale = true,
    homeBearing = 0,
  } = options;

  const map = useMap();
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const homeLabel = turnHomeLabel[locale];

  useEffect(() => {
    if (!map) return;

    const controls: maplibregl.IControl[] = [];
    const cleanups: (() => void)[] = [];

    if (showSearch) {
      // Inline search is handled by SearchBar in map-renderer
    }

    if (showNavigation) {
      const navControl = new NavigationControl({ showZoom: false });
      map.addControl(navControl, 'top-right');
      controls.push(navControl);
      if (Math.abs(homeBearing) >= NORTH_TOLERANCE_DEGREES) {
        cleanups.push(turnHomeFromNorth(map, navControl._compass, homeBearing, homeLabel));
      }
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
      for (const cleanup of cleanups) cleanup();
      for (const control of controls) {
        if (map.hasControl(control)) {
          map.removeControl(control);
        }
      }
    };
  }, [map, showSearch, showNavigation, showGeolocate, showScale, homeBearing, homeLabel]);
};
