import { DynamicLucidIconRenderer } from '@/features/map/components/maplibre-renderer/dynamic-lucid-icon-renderer';

import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';

import { reactToDomElement } from '@/utils/react-to-dom-element';

import { Marker, Popup } from 'maplibre-gl';

import { useMap } from '@/features/map/components/maplibre-renderer/map-context-provider';
import { MapPin } from 'lucide-react';
import { useEffect, useRef } from 'react';

export const useAnnotationPointMarkers = (
  annotations: CampMapAnnotationPoint[],
  currentAnnotation: CampMapAnnotationPoint | CampMapAnnotationPolygon | undefined,
  setCurrentAnnotation: (annotation: CampMapAnnotationPoint | undefined) => void,
): void => {
  const activeMarkers = useRef<Marker[]>([]);
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Clear old markers
    for (const marker of activeMarkers.current) marker.remove();
    activeMarkers.current = [];

    for (const annotation of annotations) {
      const popup = new Popup();
      popup.on('open', () => setCurrentAnnotation(annotation));

      // Determine if this is the selected annotation
      const isSelected = annotation.id === currentAnnotation?.id;
      const markerElement = reactToDomElement(
        isSelected ? (
          <MapPin className="h-12 w-12 text-red-300" fill="#e11d3c" />
        ) : (
          <DynamicLucidIconRenderer icon={annotation.icon} color={annotation.color} />
        ),
      );
      markerElement.id = `marker-${annotation.id}`;
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

    // Re-run effect when selectedAnnotationId changes to update markers
  }, [map, annotations, setCurrentAnnotation, currentAnnotation]);
};
