import type { CeviLogoMarker } from '@/features/map/types/types';
import type { Map as MapLibre } from 'maplibre-gl';
import { Marker } from 'maplibre-gl';
import { useEffect, useRef } from 'react';

export const useCeviLogoMarkers = (
  map: MapLibre | null,
  markersData: CeviLogoMarker[],
  elementFactory: () => HTMLElement,
): void => {
  const activeMarkers = useRef<Marker[]>([]);

  useEffect(() => {
    if (!map) return;

    for (const marker of activeMarkers.current) marker.remove();
    activeMarkers.current = [];

    for (const markerData of markersData) {
      const marker = new Marker({ element: elementFactory() })
        .setLngLat(markerData.geometry.coordinates)
        .addTo(map);
      activeMarkers.current.push(marker);
    }
  }, [map, markersData, elementFactory]);
};
