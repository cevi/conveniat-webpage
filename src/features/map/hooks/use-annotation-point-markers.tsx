import { DynamicLucidIconRenderer } from '@/features/map/components/dynamic-lucid-icon-renderer';

import type { CampMapAnnotationPoint } from '@/features/map/types/types';

import { reactToDomElement } from '@/utils/react-to-dom-element';

import type { Map as MapLibre } from 'maplibre-gl';
import { Marker, Popup } from 'maplibre-gl';

import { MapPin } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export const useAnnotationPointMarkers = (
  map: MapLibre | null,
  annotations: CampMapAnnotationPoint[],
  onAnnotationClick: (annotation: CampMapAnnotationPoint) => void,
): void => {
  const activeMarkers = useRef<Marker[]>([]);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | undefined>();

  useEffect(() => {
    if (!map) return;

    // Clear old markers
    for (const marker of activeMarkers.current) marker.remove();
    activeMarkers.current = [];

    for (const annotation of annotations) {
      const popup = new Popup();
      popup.on('open', () => onAnnotationClick(annotation));

      // Determine if this is the selected annotation
      const isSelected = annotation.id === selectedAnnotationId;
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
        setSelectedAnnotationId(annotation.id); // Set the clicked annotation as selected
      });

      activeMarkers.current.push(marker);
    }
    // Re-run effect when selectedAnnotationId changes to update markers
  }, [map, annotations, onAnnotationClick, selectedAnnotationId]);
};
