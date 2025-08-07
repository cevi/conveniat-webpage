import { useMap } from '@/features/map/components/maplibre-renderer/map-context-provider';
import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';
import type { Map as MapLibre, MapMouseEvent } from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';

interface ClickedFeaturesState {
  polygons: CampMapAnnotationPolygon[];
  currentIndex: number;
}

export const useAnnotationPolygons = (
  annotations: CampMapAnnotationPolygon[],
  currentAnnotation: CampMapAnnotationPoint | CampMapAnnotationPolygon | undefined,
  setCurrentAnnotation: (
    annotation: CampMapAnnotationPoint | CampMapAnnotationPolygon | undefined,
  ) => void,
): void => {
  const map = useMap();

  // eslint-disable-next-line react-naming-convention/use-state
  const [, setClickedPolygonState] = useState<ClickedFeaturesState | undefined>();

  // Use a ref to hold the mutable map instance and event handlers to avoid re-creating them
  // and issues with stale closures inside event listeners.
  const mapReference = useRef<MapLibre | undefined>(undefined);
  mapReference.current = map;

  // Ref to track the previously selected annotation ID for efficient outline toggling
  const previousAnnotationId = useRef<string | undefined>(undefined);

  // set initial previousAnnotationId to the current annotation ID
  useEffect(() => {
    previousAnnotationId.current = currentAnnotation?.id;
  });

  // Effect for setting up and tearing down map sources and layers
  useEffect(() => {
    if (!map) return;

    const setupLayers = (): void => {
      for (const annotation of annotations) {
        const sourceId = `polygon-${annotation.id}`;
        const fillLayerId = `polygon-layer-${annotation.id}`;
        const outlineLayerId = `polygon-outline-layer-${annotation.id}`;

        // Skip if coordinates are empty
        if (annotation.geometry.coordinates.length === 0) continue;

        // Ensure coordinates are properly formatted for GeoJSON Polygon
        const coordinates = [
          [...annotation.geometry.coordinates, annotation.geometry.coordinates[0]],
        ] as unknown as [number, number][][];

        // Only add source and layer if they don't already exist
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: { id: annotation.id, title: annotation.title },
              geometry: {
                type: 'Polygon',
                coordinates: coordinates,
              },
            },
          });
        }

        // Add fill layer
        if (!map.getLayer(fillLayerId)) {
          map.addLayer({
            id: fillLayerId,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': annotation.color,
              'fill-opacity': 0.4,
            },
          });
        }

        // Add outline layer (initially invisible)
        if (!map.getLayer(outlineLayerId)) {
          map.addLayer({
            id: outlineLayerId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': '#e11d3c',
              'line-width': currentAnnotation?.id === annotation.id ? 4 : 0,
              'line-opacity': 0.9,
            },
          });
        }

        // Add mouseenter and mouseleave events to the fill layer
        map.on('mouseenter', fillLayerId, () => {
          if (mapReference.current) mapReference.current.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', fillLayerId, () => {
          if (mapReference.current) mapReference.current.getCanvas().style.cursor = '';
        });
      }
    };

    const cleanupLayers = (): void => {
      for (const annotation of annotations) {
        const sourceId = `polygon-${annotation.id}`;
        const fillLayerId = `polygon-layer-${annotation.id}`;
        const outlineLayerId = `polygon-outline-layer-${annotation.id}`;

        // this is necessary during hot reloading
        if (map.getLayer(outlineLayerId)) map.removeLayer(outlineLayerId);
        if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      }
    };

    if (map.isStyleLoaded() === true) {
      setupLayers();
    } else {
      map.on('load', setupLayers);
    }

    return (): void => {
      try {
        if (map.isStyleLoaded() === true) cleanupLayers();
      } catch (error) {
        console.error('Error during cleanup of polygon layers:', error);
      }
      map.off('load', setupLayers);
    };
  }, [map, annotations, currentAnnotation?.id]);

  // Effect for updating the polygon outline based on selection
  // eslint-disable-next-line complexity
  useEffect(() => {
    if (map?.isStyleLoaded() === false) return;

    const currentId = currentAnnotation?.id;
    const previousId = previousAnnotationId.current;

    if (currentId === previousId) return; // No change in selection

    // Hide the outline for the previously selected polygon
    if (previousId != undefined) {
      const previousLayerId = `polygon-outline-layer-${previousId}`;
      if (map?.getLayer(previousLayerId)) {
        map.setPaintProperty(previousLayerId, 'line-width', 0);
      }
    }

    // Show the outline for the newly selected polygon, if it's managed by this hook
    const isCurrentAnnotationAPolygon = annotations.some((a) => a.id === currentId);
    if (currentId != undefined && isCurrentAnnotationAPolygon) {
      const currentLayerId = `polygon-outline-layer-${currentId}`;
      if (map?.getLayer(currentLayerId)) {
        map.setPaintProperty(currentLayerId, 'line-width', 4);
      }
    }

    // Update the ref for the next render
    previousAnnotationId.current = currentId;
  }, [map, annotations, currentAnnotation]);

  // Effect for handling map click events
  useEffect(() => {
    if (!map) return;

    const handleClick = (event: MapMouseEvent): void => {
      const currentMap = mapReference.current;
      if (!currentMap) return;

      const features = currentMap.queryRenderedFeatures(event.point, {
        layers: annotations.map((p) => `polygon-layer-${p.id}`),
      });

      const clickedPolygons = annotations.filter((poly) =>
        features.some((feature) => feature.properties['id'] === poly.id),
      );

      if (clickedPolygons.length === 0) {
        setClickedPolygonState(undefined);
        setCurrentAnnotation(undefined); // Also clear the current annotation
        const url = new URL(globalThis.location.href);
        url.searchParams.delete('locationId');
        globalThis.history.pushState({}, '', url.toString());
        return;
      }

      setClickedPolygonState((previousState) => {
        const sortedClickedPolygons = clickedPolygons.sort((a, b) => a.id.localeCompare(b.id));
        const currentIds = previousState?.polygons.map((p) => p.id).sort();
        const newIds = sortedClickedPolygons.map((p) => p.id).sort();

        const isSameSetOfPolygons =
          currentIds &&
          newIds.length === currentIds.length &&
          newIds.every((id, index) => id === currentIds[index]);

        let nextState: ClickedFeaturesState;
        if (isSameSetOfPolygons === true && previousState && sortedClickedPolygons.length > 1) {
          const nextIndex = (previousState.currentIndex + 1) % sortedClickedPolygons.length;
          nextState = {
            polygons: sortedClickedPolygons,
            currentIndex: nextIndex,
          };
        } else {
          nextState = {
            polygons: sortedClickedPolygons,
            currentIndex: 0,
          };
        }

        const selectedPolygon = nextState.polygons[nextState.currentIndex];
        if (selectedPolygon) {
          setCurrentAnnotation(selectedPolygon);
          const url = new URL(globalThis.location.href);
          url.searchParams.set('locationId', selectedPolygon.id);
          globalThis.history.pushState({}, '', url.toString());
        }

        return nextState;
      });
    };

    map.on('click', handleClick);

    return (): void => {
      map.off('click', handleClick);
    };
  }, [map, annotations, setCurrentAnnotation]);
};
