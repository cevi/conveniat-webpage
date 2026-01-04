import { useMap } from '@/features/map/components/maplibre-renderer/map-context-provider';
import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';
import type { GeoJSONSource, MapGeoJSONFeature, Map as MapLibre, MapMouseEvent } from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';

interface ClickedFeaturesState {
  polygons: CampMapAnnotationPolygon[];
  currentIndex: number;
}

// IDs for the batched polygon source and layers
const POLYGONS_SOURCE_ID = 'all-polygons-source';
const POLYGONS_FILL_LAYER_ID = 'all-polygons-fill-layer';
const POLYGONS_OUTLINE_LAYER_ID = 'all-polygons-outline-layer';

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
  const [clickedPolygonState, setClickedPolygonState] = useState<
    ClickedFeaturesState | undefined
  >();

  const mapReference = useRef<MapLibre | undefined>(undefined);
  mapReference.current = map;

  // Effect for setting up and tearing down map sources and layers
  useEffect(() => {
    if (!map) return;

    const isStyleReady = (): boolean => {
      try {
        return map.isStyleLoaded() === true;
      } catch {
        return false;
      }
    };

    const buildFeatureCollection = (): GeoJSON.FeatureCollection<GeoJSON.Polygon> => {
      return {
        type: 'FeatureCollection',
        features: annotations
          .filter((a) => a.geometry.coordinates.length > 0)
          .map((annotation) => ({
            type: 'Feature' as const,
            properties: {
              id: annotation.id,
              title: annotation.title,
              color: annotation.color,
              isInteractive: annotation.isInteractive,
            },
            geometry: {
              type: 'Polygon' as const,
              coordinates: [
                [...annotation.geometry.coordinates, annotation.geometry.coordinates[0]],
              ] as [number, number][][],
            },
          })),
      };
    };

    const setupLayers = (): void => {
      if (!isStyleReady()) return;

      // 1. Add a single batched source for all polygon annotations
      if (!map.getSource(POLYGONS_SOURCE_ID)) {
        map.addSource(POLYGONS_SOURCE_ID, {
          type: 'geojson',
          data: buildFeatureCollection(),
        });
      }

      // 2. Add a single fill layer with data-driven styling
      if (!map.getLayer(POLYGONS_FILL_LAYER_ID)) {
        map.addLayer({
          id: POLYGONS_FILL_LAYER_ID,
          type: 'fill',
          source: POLYGONS_SOURCE_ID,
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': 0.4,
          },
        });
      }

      // 3. Add a single outline layer with data-driven styling
      if (!map.getLayer(POLYGONS_OUTLINE_LAYER_ID)) {
        map.addLayer({
          id: POLYGONS_OUTLINE_LAYER_ID,
          type: 'line',
          source: POLYGONS_SOURCE_ID,
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 2,
            'line-opacity': 0.5,
          },
        });
      }

      // 4. Add selection highlight source and layer (initially empty)
      const selectedPolygon = annotations.find((a) => a.id === currentAnnotation?.id);
      const selectedCoordinates =
        selectedPolygon === undefined
          ? undefined
          : ([
              [...selectedPolygon.geometry.coordinates, selectedPolygon.geometry.coordinates[0]],
            ] as [number, number][][]);

      if (!map.getSource(SELECTED_POLYGON_SOURCE_ID)) {
        map.addSource(SELECTED_POLYGON_SOURCE_ID, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features:
              selectedCoordinates === undefined
                ? []
                : [
                    {
                      type: 'Feature',
                      properties: {},
                      geometry: {
                        type: 'Polygon',
                        coordinates: selectedCoordinates,
                      },
                    },
                  ],
          },
        });
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
      if (!isStyleReady()) return;

      // Remove the single selection layer and source
      if (map.getLayer(SELECTED_POLYGON_LAYER_ID)) map.removeLayer(SELECTED_POLYGON_LAYER_ID);
      if (map.getSource(SELECTED_POLYGON_SOURCE_ID)) map.removeSource(SELECTED_POLYGON_SOURCE_ID);

      // Remove the batched polygon layers and source
      if (map.getLayer(POLYGONS_OUTLINE_LAYER_ID)) map.removeLayer(POLYGONS_OUTLINE_LAYER_ID);
      if (map.getLayer(POLYGONS_FILL_LAYER_ID)) map.removeLayer(POLYGONS_FILL_LAYER_ID);
      if (map.getSource(POLYGONS_SOURCE_ID)) map.removeSource(POLYGONS_SOURCE_ID);
    };

    if (isStyleReady()) {
      setupLayers();
    } else {
      map.on('load', setupLayers);
    }

    return (): void => {
      try {
        if (isStyleReady()) cleanupLayers();
      } catch (error) {
        console.error('Error during cleanup of polygon layers:', error);
      }
      map.off('load', setupLayers);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, annotations]); // This effect now only depends on map and the list of annotations

  // Effect for updating the polygon source data when annotations change (after initial setup)
  useEffect(() => {
    if (!map) return;

    const isStyleReady = (): boolean => {
      try {
        return map.isStyleLoaded() === true;
      } catch {
        return false;
      }
    };

    if (!isStyleReady()) return;

    const source = map.getSource(POLYGONS_SOURCE_ID);
    if (!source) return;
    const sourceTyped = source as GeoJSONSource;

    sourceTyped.setData({
      type: 'FeatureCollection',
      features: annotations
        .filter((a) => a.geometry.coordinates.length > 0)
        .map((annotation) => ({
          type: 'Feature' as const,
          properties: {
            id: annotation.id,
            title: annotation.title,
            color: annotation.color,
            isInteractive: annotation.isInteractive,
          },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [
              [...annotation.geometry.coordinates, annotation.geometry.coordinates[0]],
            ] as [number, number][][],
          },
        })),
    });
  }, [map, annotations]);

  // Effect for updating the single polygon outline layer based on selection
  useEffect(() => {
    const isStyleReady = (): boolean => map?.isStyleLoaded() === true;

    if (!isStyleReady() || map === undefined) return;

    const source = map.getSource(SELECTED_POLYGON_SOURCE_ID);
    if (source === undefined) return;
    const sourceTyped = source as GeoJSONSource;

    const selectedPolygon = annotations.find((a) => a.id === currentAnnotation?.id);
    if (selectedPolygon) {
      // A polygon is selected: update the source data with its geometry
      const coordinates = [
        [...selectedPolygon.geometry.coordinates, selectedPolygon.geometry.coordinates[0]],
      ] as unknown as [number, number][][];

      sourceTyped.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: coordinates,
        },
      });
    } else {
      // No polygon is selected: clear the source data
      sourceTyped.setData({
        type: 'FeatureCollection',
        features: [],
      });
    }
  }, [map, annotations, currentAnnotation]);

  // Effect for hover cursor (interactive polygons)
  useEffect(() => {
    if (!map) return;

    const handleMouseMove = (event: MapMouseEvent): void => {
      const features = map.queryRenderedFeatures(event.point, {
        layers: [POLYGONS_FILL_LAYER_ID],
      });

      const hasInteractive = features.some(
        (f: MapGeoJSONFeature) => f.properties['isInteractive'] === true,
      );

      map.getCanvas().style.cursor = hasInteractive ? 'pointer' : '';
    };

    const handleMouseLeave = (): void => {
      map.getCanvas().style.cursor = '';
    };

    map.on('mousemove', POLYGONS_FILL_LAYER_ID, handleMouseMove);
    map.on('mouseleave', POLYGONS_FILL_LAYER_ID, handleMouseLeave);

    return (): void => {
      map.off('mousemove', POLYGONS_FILL_LAYER_ID, handleMouseMove);
      map.off('mouseleave', POLYGONS_FILL_LAYER_ID, handleMouseLeave);
    };
  }, [map]);

  // Effect for handling map click events
  useEffect(() => {
    if (!map) return;

    const handleClick = (event: MapMouseEvent): void => {
      const features = map.queryRenderedFeatures(event.point, {
        layers: [POLYGONS_FILL_LAYER_ID],
      });

      const clickedPolygons = annotations.filter(
        (poly) =>
          poly.isInteractive &&
          features.some((feature: MapGeoJSONFeature) => feature.properties['id'] === poly.id),
      );

      if (clickedPolygons.length === 0) {
        setClickedPolygonState(undefined);
        setCurrentAnnotation(undefined);
        const url = new URL(globalThis.location.href);
        url.searchParams.delete('locationId');
        globalThis.history.pushState({}, '', url.toString());
        return;
      }

      // Use the state captured in closure (added to deps) instead of functional update
      // to avoid side-effects (setCurrentAnnotation) inside reducer
      const previousState = clickedPolygonState;

      const sortedClickedPolygons = clickedPolygons.sort((a, b) => a.id.localeCompare(b.id));
      const currentIds = previousState?.polygons.map((p: CampMapAnnotationPolygon) => p.id).sort();
      const newIds = sortedClickedPolygons.map((p: CampMapAnnotationPolygon) => p.id).sort();

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

      setClickedPolygonState(nextState);

      const selectedPolygon = nextState.polygons[nextState.currentIndex];
      if (selectedPolygon) {
        setCurrentAnnotation(selectedPolygon);
        const url = new URL(globalThis.location.href);
        url.searchParams.set('locationId', selectedPolygon.id);
        globalThis.history.pushState({}, '', url.toString());
      }
    };

    map.on('click', handleClick);

    return (): void => {
      map.off('click', handleClick);
    };
  }, [map, annotations, setCurrentAnnotation, clickedPolygonState]);
};
