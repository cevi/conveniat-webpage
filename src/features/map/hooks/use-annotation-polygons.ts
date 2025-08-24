import { useMap } from '@/features/map/components/maplibre-renderer/map-context-provider';
import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';
import type {
  CanvasSourceSpecification,
  GeoJSONSource,
  Map as MapLibre,
  MapMouseEvent,
  SourceSpecification,
} from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';

interface ClickedFeaturesState {
  polygons: CampMapAnnotationPolygon[];
  currentIndex: number;
}

// IDs for the single source and layer used for the selection outline
const SELECTED_POLYGON_SOURCE_ID = 'selected-polygon-source';
const SELECTED_POLYGON_LAYER_ID = 'selected-polygon-outline-layer';

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

  const mapReference = useRef<MapLibre | undefined>(undefined);
  mapReference.current = map;

  // Effect for setting up and tearing down map sources and layers
  useEffect(() => {
    if (!map) return;

    const setupLayers = (): void => {
      // 1. Add individual sources and FILL layers for each polygon annotation
      for (const annotation of annotations) {
        const sourceId = `polygon-${annotation.id}`;
        const fillLayerId = `polygon-layer-${annotation.id}`;

        if (annotation.geometry.coordinates.length === 0) continue;

        const coordinates = [
          [...annotation.geometry.coordinates, annotation.geometry.coordinates[0]],
        ] as unknown as [number, number][][];

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

        // Add hover cursor effect
        map.on('mouseenter', fillLayerId, () => {
          mapReference.current?.getCanvas().style.setProperty('cursor', 'pointer');
        });
        map.on('mouseleave', fillLayerId, () => {
          mapReference.current?.getCanvas().style.setProperty('cursor', '');
        });
      }
      const selectedPolygon = annotations.find((a) => a.id === currentAnnotation?.id);
      const coordinates =
        selectedPolygon === undefined
          ? undefined
          : ([
              [...selectedPolygon.geometry.coordinates, selectedPolygon.geometry.coordinates[0]],
            ] as unknown as [number, number][][]);

      // 2. Add a SINGLE source and layer for the selection OUTLINE
      if (!map.getSource(SELECTED_POLYGON_SOURCE_ID)) {
        map.addSource(SELECTED_POLYGON_SOURCE_ID, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              ...(coordinates === undefined
                ? [] // empty if not selected via URL param
                : [
                    {
                      type: 'Feature',
                      properties: {},
                      geometry: {
                        type: 'Polygon',
                        coordinates: coordinates,
                      },
                    },
                  ]),
            ],
          },
        } as SourceSpecification | CanvasSourceSpecification);
      }

      if (!map.getLayer(SELECTED_POLYGON_LAYER_ID)) {
        map.addLayer({
          id: SELECTED_POLYGON_LAYER_ID,
          type: 'line',
          source: SELECTED_POLYGON_SOURCE_ID,
          paint: {
            'line-color': '#e11d3c',
            'line-width': 4,
            'line-opacity': 0.9,
          },
        });
      }
    };

    const cleanupLayers = (): void => {
      // Remove the single selection layer and source
      if (map.getLayer(SELECTED_POLYGON_LAYER_ID)) map.removeLayer(SELECTED_POLYGON_LAYER_ID);
      if (map.getSource(SELECTED_POLYGON_SOURCE_ID)) map.removeSource(SELECTED_POLYGON_SOURCE_ID);

      // Remove all individual polygon fill layers and sources
      for (const annotation of annotations) {
        const sourceId = `polygon-${annotation.id}`;
        const fillLayerId = `polygon-layer-${annotation.id}`;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, annotations]); // This effect now only depends on map and the list of annotations

  // Effect for updating the single polygon outline layer based on selection
  useEffect(() => {
    if (map?.isStyleLoaded() === false || map === undefined) return;

    const source = map.getSource(SELECTED_POLYGON_SOURCE_ID) as GeoJSONSource | undefined;
    if (!source) return;

    const selectedPolygon = annotations.find((a) => a.id === currentAnnotation?.id);

    if (selectedPolygon) {
      // A polygon is selected: update the source data with its geometry
      const coordinates = [
        [...selectedPolygon.geometry.coordinates, selectedPolygon.geometry.coordinates[0]],
      ] as unknown as [number, number][][];

      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: coordinates,
        },
      });
    } else {
      // No polygon is selected: clear the source data
      source.setData({
        type: 'FeatureCollection',
        features: [],
      });
    }
  }, [map, annotations, currentAnnotation]);

  // Effect for handling map click events (largely unchanged)
  useEffect(() => {
    if (!map) return;

    const handleClick = (event: MapMouseEvent): void => {
      const features = map.queryRenderedFeatures(event.point, {
        layers: annotations.map((p) => `polygon-layer-${p.id}`),
      });

      const clickedPolygons = annotations.filter((poly) =>
        features.some((feature) => feature.properties['id'] === poly.id),
      );

      if (clickedPolygons.length === 0) {
        setClickedPolygonState(undefined);
        setCurrentAnnotation(undefined);
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
          nextState = { polygons: sortedClickedPolygons, currentIndex: nextIndex };
        } else {
          nextState = { polygons: sortedClickedPolygons, currentIndex: 0 };
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
