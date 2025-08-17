import { useMap } from '@/features/map/components/maplibre-renderer/map-context-provider';
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

export const useMapControls = (): void => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    map.addControl(new SearchButton(), 'top-right');
    map.addControl(
      new NavigationControl({
        showZoom: false,
      }),
    );
    map.addControl(new ScaleControl({ maxWidth: 120, unit: 'metric' }));
    map.addControl(
      new GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
    );
  }, [map]);
};
