import {
  applyMarkerLabelPlacement,
  applyMarkerTailAngle,
  DynamicLucidIconRenderer,
  MARKER_LABEL_SELECTOR,
  MARKER_TAIL_SELECTOR,
} from '@/features/map/components/maplibre-renderer/dynamic-lucid-icon-renderer';

import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';

import { useStar } from '@/hooks/use-star';
import { reactToDomElement } from '@/utils/react-to-dom-element';

import { Marker, Popup } from 'maplibre-gl';

import { useMap } from '@/features/map/components/maplibre-renderer/map-context-provider';
import type { LabelLayoutCandidate } from '@/features/map/utils/marker-label-layout';
import { chooseLabelPlacements } from '@/features/map/utils/marker-label-layout';
import {
  getCoincidentMarkerOffset,
  getCoordinateKey,
  getMarkerLabelPlacement,
  getMarkerTailAngle,
} from '@/features/map/utils/marker-stacking';
import {
  isMarkerLabelVisibleAtZoom,
  isMarkerVisibleAtZoom,
} from '@/features/map/utils/marker-visibility';
import { useEffect, useRef } from 'react';

interface ActiveMarker {
  id: string;
  marker: Marker;
  coordinates: [number, number];
  importance: CampMapAnnotationPoint['importance'];
  showLabel: boolean;
  /** Identifies markers sharing a position, see {@link getCoordinateKey}. */
  coordinateKey: string;
  /** Rendered size of the title, measured once it is shown for the first time. */
  labelSize?: { width: number; height: number };
}

/**
 * Rendered size of a marker title. Reading it forces a layout, so the result is remembered on the
 * marker — it does not change with the zoom level.
 */
const measureLabel = (
  activeMarker: ActiveMarker,
  labelElement: HTMLElement,
): { width: number; height: number } => {
  const cached = activeMarker.labelSize;
  if (cached !== undefined) return cached;

  const size = { width: labelElement.offsetWidth, height: labelElement.offsetHeight };
  // a zero width means the label has not been laid out yet, e.g. while fonts are still loading
  if (size.width > 0) activeMarker.labelSize = size;
  return size;
};

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

    // Function to update visibility of all markers and their labels based on current zoom, and to
    // fan out markers that would otherwise be drawn exactly on top of each other. Only the markers
    // actually shown at this zoom level take part in a fan, so hidden ones leave no gap behind.
    const updateMarkerVisibility = (): void => {
      const zoom = map.getZoom();

      const isVisible = ({ importance }: ActiveMarker): boolean =>
        isMarkerVisibleAtZoom(importance, zoom);

      const groupSizes = new Map<string, number>();
      for (const activeMarker of activeMarkers.current) {
        if (!isVisible(activeMarker)) continue;
        const { coordinateKey } = activeMarker;
        groupSizes.set(coordinateKey, (groupSizes.get(coordinateKey) ?? 0) + 1);
      }

      // first pass: show or hide every marker, fan out the ones sharing a coordinate and aim their
      // tails back at it
      const stackIndexes = new Map<string, number>();
      const candidates: (LabelLayoutCandidate & { labelElement: HTMLElement })[] = [];

      for (const activeMarker of activeMarkers.current) {
        const { id, marker, coordinates, importance, showLabel, coordinateKey } = activeMarker;
        const element = marker.getElement();
        const visible = isVisible(activeMarker);
        element.style.display = visible ? '' : 'none';

        const labelElement = element.querySelector<HTMLElement>(MARKER_LABEL_SELECTOR);
        const labelVisible =
          visible &&
          isMarkerLabelVisibleAtZoom(showLabel, importance, zoom) &&
          labelElement !== null;
        if (labelElement) labelElement.style.display = labelVisible ? '' : 'none';

        if (!visible) continue;

        const groupSize = groupSizes.get(coordinateKey) ?? 1;
        const stackIndex = stackIndexes.get(coordinateKey) ?? 0;
        stackIndexes.set(coordinateKey, stackIndex + 1);

        const offset = getCoincidentMarkerOffset(stackIndex, groupSize);
        marker.setOffset(offset);

        const tailElement = element.querySelector<HTMLElement>(MARKER_TAIL_SELECTOR);
        if (tailElement) applyMarkerTailAngle(tailElement, getMarkerTailAngle(offset));

        if (!labelVisible) continue;

        const projected = map.project(coordinates);
        candidates.push({
          id,
          anchor: { x: projected.x + offset[0], y: projected.y + offset[1] },
          preferredPlacement: getMarkerLabelPlacement(stackIndex, groupSize),
          labelSize: measureLabel(activeMarker, labelElement),
          labelElement,
        });
      }

      // second pass: give every title the side that keeps it clear of neighbouring pins and of the
      // titles placed before it
      const placements = chooseLabelPlacements(candidates);
      for (const candidate of candidates) {
        const placement = placements.get(candidate.id);
        if (placement !== undefined) applyMarkerLabelPlacement(candidate.labelElement, placement);
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

      activeMarkers.current.push({
        id: annotation.id,
        marker,
        coordinates: annotation.geometry.coordinates,
        importance: annotation.importance,
        showLabel,
        coordinateKey: getCoordinateKey(annotation.geometry.coordinates),
      });
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
