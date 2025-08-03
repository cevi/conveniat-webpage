import { useMap } from '@/features/map/components/maplibre-renderer/map-context-provider';
import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';
import type { Map as MapLibre } from 'maplibre-gl';
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

  // Effect for setting up and tearing down map sources and layers
  useEffect(() => {
    if (!map) return;

    const setupLayers = (): void => {
      for (const annotation of annotations) {
        const sourceId = `polygon-${annotation.id}`;
        const layerId = `polygon-layer-${annotation.id}`;

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

        if (!map.getLayer(layerId)) {
          map.addLayer({
            id: layerId,
            type: 'fill',
            source: sourceId,
            paint: { 'fill-color': annotation.color, 'fill-opacity': 0.4 },
          });
        }

        // Add mouseenter and mouseleave events
        map.on('mouseenter', layerId, () => {
          if (mapReference.current) mapReference.current.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', layerId, () => {
          if (mapReference.current) mapReference.current.getCanvas().style.cursor = '';
        });
      }
    };

    // Clean up function for sources and layers
    const cleanupLayers = (): void => {
      for (const annotation of annotations) {
        const sourceId = `polygon-${annotation.id}`;
        const layerId = `polygon-layer-${annotation.id}`;

        // this is necessary during hot reloading
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }

        // this is necessary during hot reloading
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      }
    };

    // Listen for 'load' event if map is not already loaded
    if (map.isStyleLoaded() === true) {
      setupLayers();
    } else {
      map.on('load', setupLayers);
    }

    // Cleanup when component unmounts or annotations change
    return (): void => {
      try {
        cleanupLayers();
      } catch (error) {
        console.error('Error during cleanup of polygon layers:', error);
      }
      map.off('load', setupLayers);
    };
  }, [map, annotations]);

  // Effect for handling map click events
  useEffect(() => {
    if (!map) return;

    const handleClick = (event: maplibregl.MapMouseEvent): void => {
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
        // Clear location from URL if no polygon is clicked
        const url = new URL(globalThis.location.href);
        url.searchParams.delete('locationId');
        globalThis.history.pushState({}, '', url.toString());
        return;
      }

      setClickedPolygonState((previousState) => {
        const sortedClickedPolygons = clickedPolygons.sort((a, b) => a.id.localeCompare(b.id));
        const currentIds = previousState?.polygons.map((p) => p.id).sort();
        const newIds = sortedClickedPolygons.map((p) => p.id).sort();

        // Check if the new set of clicked polygons is the same as the previous one
        const isSameSetOfPolygons =
          currentIds &&
          newIds.length === currentIds.length &&
          newIds.every((id, index) => id === currentIds[index]);

        let nextState: ClickedFeaturesState;
        if (isSameSetOfPolygons === true && previousState && sortedClickedPolygons.length > 1) {
          // If the same set of overlapping polygons, cycle through them
          const nextIndex = (previousState.currentIndex + 1) % sortedClickedPolygons.length;
          nextState = {
            polygons: sortedClickedPolygons,
            currentIndex: nextIndex,
          };
        } else {
          // If a new set of polygons or only one polygon, start a new cycle
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

    // Cleanup map click listener
    return (): void => {
      map.off('click', handleClick);
    };
  }, [map, annotations, setCurrentAnnotation]);
};
