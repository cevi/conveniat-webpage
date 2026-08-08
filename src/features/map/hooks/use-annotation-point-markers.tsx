import {
  DynamicLucidIconRenderer,
  MARKER_LABEL_SELECTOR,
} from '@/features/map/components/maplibre-renderer/dynamic-lucid-icon-renderer';

import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';

import { useStar } from '@/hooks/use-star';
import { reactToDomElement } from '@/utils/react-to-dom-element';

import { Marker, Popup } from 'maplibre-gl';

import { useMap } from '@/features/map/components/maplibre-renderer/map-context-provider';
import {
  isMarkerLabelVisibleAtZoom,
  isMarkerVisibleAtZoom,
} from '@/features/map/utils/marker-visibility';
import { useEffect, useRef } from 'react';

interface ActiveMarker {
  marker: Marker;
  importance: CampMapAnnotationPoint['importance'];
  showLabel: boolean;
}

export const useAnnotationPointMarkers = (
  annotations: CampMapAnnotationPoint[],
  currentAnnotation: CampMapAnnotationPoint | CampMapAnnotationPolygon | undefined,
  setCurrentAnnotation: (annotation: CampMapAnnotationPoint | undefined) => void,
): void => {
  const activeMarkers = useRef<ActiveMarker[]>([]);
  const map = useMap();
  const { starredEntries } = useStar();

  useEffect(() => {
    if (!map) return;

    // Clear old markers
    for (const { marker } of activeMarkers.current) marker.remove();
    activeMarkers.current = [];

    // Function to update visibility of all markers and their labels based on current zoom
    const updateMarkerVisibility = (): void => {
      const zoom = map.getZoom();
      for (const { marker, importance, showLabel } of activeMarkers.current) {
        const element = marker.getElement();
        element.style.display = isMarkerVisibleAtZoom(importance, zoom) ? '' : 'none';

        const labelElement = element.querySelector<HTMLElement>(MARKER_LABEL_SELECTOR);
        if (labelElement) {
          labelElement.style.display = isMarkerLabelVisibleAtZoom(showLabel, importance, zoom)
            ? ''
            : 'none';
        }
      }
    };

    for (const annotation of annotations) {
      const popup = new Popup();
      popup.on('open', () => setCurrentAnnotation(annotation));

      // Determine if this is the selected annotation
      const isSelected = annotation.id === currentAnnotation?.id;
      const starred = starredEntries.has(annotation.id);
      const showLabel = annotation.showLabel !== false;
      const markerElement = reactToDomElement(
        <DynamicLucidIconRenderer
          icon={annotation.icon}
          color={annotation.color}
          isStarred={starred}
          isSelected={isSelected}
          label={showLabel ? annotation.title : undefined}
        />,
      );
      markerElement.id = `marker-${annotation.id}`;
      // lift the selected marker (and its label) above its neighbours
      if (isSelected) markerElement.style.zIndex = '1';
      const marker = new Marker({ scale: 1.5, element: markerElement, anchor: 'bottom' })
        .setLngLat(annotation.geometry.coordinates)
        .setPopup(popup)
        .addTo(map);

      marker.getElement().addEventListener('click', (event) => {
        event.stopPropagation();
        marker.togglePopup();
      });

      activeMarkers.current.push({ marker, importance: annotation.importance, showLabel });
    }

    // Set initial visibility
    updateMarkerVisibility();

    // Attach zoom listener
    map.on('zoom', updateMarkerVisibility);

    return (): void => {
      map.off('zoom', updateMarkerVisibility);
    };

    // Re-run effect when selectedAnnotationId or starredEntries changes to update markers
  }, [map, annotations, setCurrentAnnotation, currentAnnotation, starredEntries]);
};
