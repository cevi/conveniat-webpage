import { useMap } from '@/features/map/components/maplibre-renderer/map-context-provider';
import type { MapControlOptions } from '@/features/map/types/types';
import { reactToDomElement } from '@/utils/react-to-dom-element';
import { Search } from 'lucide-react';
import type maplibregl from 'maplibre-gl';
import { GeolocateControl, NavigationControl, ScaleControl } from 'maplibre-gl';
import Link from 'next/link';
import { useEffect } from 'react';

import '@/features/map/components/maplibre-renderer/style-overrides.css';

class SearchButton implements maplibregl.IControl {
  private _map: maplibregl.Map | undefined;
  private _container: HTMLElement = document.createElement('div');

  onAdd(map: maplibregl.Map): HTMLElement {
    this._map = map;
    this._container = reactToDomElement(
      <Link className="maplibregl-ctrl maplibregl-ctrl-group p-2" href="/app/map/search" prefetch>
        <Search />
      </Link>,
    );
    return this._container;
  }

  onRemove(): void {
    if (!this._map) return;

    this._container.remove();
    this._map = undefined;
  }
}

export const useMapControls = (options: MapControlOptions = {}): void => {
  const {
    showSearch = true,
    showNavigation = true,
    showGeolocate = true,
    showScale = true,
  } = options;

  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const controls: maplibregl.IControl[] = [];

    if (showSearch) {
      const searchControl = new SearchButton();
      map.addControl(searchControl, 'top-right');
      controls.push(searchControl);
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
