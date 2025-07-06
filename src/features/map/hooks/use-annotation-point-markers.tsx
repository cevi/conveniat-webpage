import { DynamicLucidIconRenderer } from '@/features/map/components/dynamic-lucid-icon-renderer';
import type { CampMapAnnotationPoint } from '@/features/map/types/types';
import { reactToDomElement } from '@/utils/react-to-dom-element';
import type { Map as MapLibre } from 'maplibre-gl';
import { Marker, Popup } from 'maplibre-gl';
import { useEffect, useRef } from 'react';

export const useAnnotationPointMarkers = (
  map: MapLibre | null,
  annotations: CampMapAnnotationPoint[],
  onAnnotationClick: (annotation: CampMapAnnotationPoint) => void,
): void => {
  const activeMarkers = useRef<Marker[]>([]);

  useEffect(() => {
    if (!map) return;

    // Clear old markers
    for (const marker of activeMarkers.current) marker.remove();
    activeMarkers.current = [];

    for (const annotation of annotations) {
      const popup = new Popup();
      popup.on('open', () => onAnnotationClick(annotation));

      const markerElement = reactToDomElement(
        <DynamicLucidIconRenderer icon={annotation.icon} color={annotation.color} />,
      );
      const marker = new Marker({ scale: 1.5, element: markerElement, anchor: 'bottom' })
        .setLngLat(annotation.geometry.coordinates)
        .setPopup(popup)
        .addTo(map);

      marker.getElement().addEventListener('click', (event) => {
        event.stopPropagation();
        marker.togglePopup();
      });
      activeMarkers.current.push(marker);
    }
  }, [map, annotations, onAnnotationClick]);
};
