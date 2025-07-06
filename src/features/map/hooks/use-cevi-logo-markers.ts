import { useMap } from '@/features/map/components/maplibre-renderer/map-context-provider';
import type { CeviLogoMarker } from '@/features/map/types/types';
import { Marker } from 'maplibre-gl';
import { useEffect, useRef } from 'react';

export const useCeviLogoMarkers = (
  markersData: CeviLogoMarker[],
  elementFactory: () => HTMLElement,
): void => {
  const activeMarkers = useRef<Marker[]>([]);

  const map = useMap();

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
