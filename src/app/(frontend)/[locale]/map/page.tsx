'use client';

import React, { useEffect, useRef } from 'react';

import 'maplibre-gl/dist/maplibre-gl.css';
import { Map as MapLibre, NavigationControl, ScaleControl } from 'maplibre-gl';

const Map = ({
  centerLongitude,
  centerLatitude,
  zoom,
}: {
  centerLongitude: number;
  centerLatitude: number;
  zoom: number;
}): React.JSX.Element => {
  const mapContainerReference = useRef(null);

  useEffect(() => {
    const _map = new MapLibre({
      container: mapContainerReference.current as unknown as HTMLDivElement,
      style:
        'https://vectortiles.geo.admin.ch/styles/ch.swisstopo.leichte-basiskarte.vt/style.json',
      center: [centerLongitude, centerLatitude],
      zoom: zoom,
    });
    _map.addControl(new NavigationControl());
    const scale = new ScaleControl({
      maxWidth: 80,
      unit: 'metric',
    });
    _map.addControl(scale);
  }, [centerLatitude, centerLongitude, zoom]);

  return <div className="h-full w-full" ref={mapContainerReference} />;
};

const WebMap = (): React.JSX.Element => {
  return (
    <article className="mx-auto my-8 max-w-2xl px-8">
      <div className="h-[600px]">
        <Map centerLongitude={8.553_01} centerLatitude={47.352_57} zoom={8} />
      </div>
    </article>
  );
};

export default WebMap;
