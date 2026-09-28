import { useMap } from '@/features/map/components/maplibre-renderer/map-context-provider';
import { POINT_LAYER_IDS } from '@/features/map/hooks/use-annotation-point-markers';
import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';
import { addLabelPlateImage, LABEL_PLATE_IMAGE_ID } from '@/features/map/utils/camp-map-images';
import { formatHexColor } from '@/utils/format-hex-color';
import type {
  FilterSpecification,
  GeoJSONSource,
  MapGeoJSONFeature,
  MapMouseEvent,
} from 'maplibre-gl';
import { useEffect, useState } from 'react';

interface ClickedFeaturesState {
  polygons: CampMapAnnotationPolygon[];
  currentIndex: number;
}

// IDs for the batched polygon source and layers
const POLYGONS_SOURCE_ID = 'all-polygons-source';
const POLYGONS_FILL_LAYER_ID = 'all-polygons-fill-layer';
const POLYGONS_OUTLINE_LAYER_ID = 'all-polygons-outline-layer';
const POLYGONS_WASH_LAYER_ID = 'all-polygons-wash-layer';
const POLYGON_LABELS_SOURCE_ID = 'polygon-labels-source';
const POLYGON_LABELS_LAYER_ID = 'polygon-labels-layer';

/** Lower keys are placed first, so they win when two names would collide. */
const LABEL_RANK: Record<CampMapAnnotationPolygon['importance'], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/**
 * Where the name of an area goes: the centroid of its outline, or the average of its corners
 * for an outline too thin to have an area (drafts skip validation, so those do arrive).
 */
const labelPosition = (coordinates: [number, number][]): [number, number] => {
  let area = 0;
  let x = 0;
  let y = 0;
  for (const [index, [x0, y0]] of coordinates.entries()) {
    const [x1, y1] = coordinates[(index + 1) % coordinates.length] ?? [x0, y0];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    x += (x0 + x1) * cross;
    y += (y0 + y1) * cross;
  }
  if (Math.abs(area) < 1e-12) {
    const sum = coordinates.reduce<[number, number]>(
      ([sumX, sumY], [pointX, pointY]) => [sumX + pointX, sumY + pointY],
      [0, 0],
    );
    return [sum[0] / coordinates.length, sum[1] / coordinates.length];
  }
  return [x / (3 * area), y / (3 * area)];
};

const buildLabelCollection = (
  annotations: CampMapAnnotationPolygon[],
): GeoJSON.FeatureCollection<GeoJSON.Point> => ({
  type: 'FeatureCollection',
  features: annotations
    .filter((annotation) => annotation.geometry.coordinates.length > 0 && annotation.title !== '')
    .map((annotation) => ({
      type: 'Feature' as const,
      properties: {
        title: annotation.title,
        importance: annotation.importance,
        rank: LABEL_RANK[annotation.importance],
      },
      geometry: {
        type: 'Point' as const,
        coordinates: labelPosition(annotation.geometry.coordinates),
      },
    })),
});

/** The markers sit above the areas, so area layers are inserted below them once they exist. */
const beneathMarkers = (map: { getLayer: (id: string) => unknown }): string | undefined =>
  POINT_LAYER_IDS.find((id) => map.getLayer(id) !== undefined);

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

  const [clickedPolygonState, setClickedPolygonState] = useState<
    ClickedFeaturesState | undefined
  >();

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
              color: formatHexColor(annotation.color),
              isInteractive: annotation.isInteractive,
              importance: annotation.importance,
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

      // 2. A soft wash of the area colour across its edge, which is what makes the fill read as
      // watercolour rather than a flat shape
      if (!map.getLayer(POLYGONS_WASH_LAYER_ID)) {
        map.addLayer(
          {
            id: POLYGONS_WASH_LAYER_ID,
            type: 'line',
            source: POLYGONS_SOURCE_ID,
            paint: {
              'line-color': ['get', 'color'],
              'line-width': ['interpolate', ['linear'], ['zoom'], 14, 6, 18, 22],
              'line-blur': ['interpolate', ['linear'], ['zoom'], 14, 5, 18, 16],
              'line-opacity': 0.3,
            },
          },
          beneathMarkers(map),
        );
      }

      // 3. The fill, in the colour the editor chose, light enough to keep the map readable
      if (!map.getLayer(POLYGONS_FILL_LAYER_ID)) {
        map.addLayer(
          {
            id: POLYGONS_FILL_LAYER_ID,
            type: 'fill',
            source: POLYGONS_SOURCE_ID,
            paint: {
              'fill-color': ['get', 'color'],
              'fill-opacity': 0.28,
            },
          },
          beneathMarkers(map),
        );
      }

      // 4. A thin ink line, so neighbouring areas of the same colour stay apart
      if (!map.getLayer(POLYGONS_OUTLINE_LAYER_ID)) {
        map.addLayer(
          {
            id: POLYGONS_OUTLINE_LAYER_ID,
            type: 'line',
            source: POLYGONS_SOURCE_ID,
            layout: { 'line-join': 'round' },
            paint: {
              'line-color': 'rgba(74, 53, 38, 0.75)',
              'line-width': ['interpolate', ['linear'], ['zoom'], 14, 0.7, 18, 1.8],
            },
          },
          beneathMarkers(map),
        );
      }

      // 5. The name of every area on a white plate. Markers are placed before it, so a name
      // makes room for a marker rather than the other way round.
      addLabelPlateImage(map);
      if (!map.getSource(POLYGON_LABELS_SOURCE_ID)) {
        map.addSource(POLYGON_LABELS_SOURCE_ID, {
          type: 'geojson',
          data: buildLabelCollection(annotations),
        });
      }
      if (!map.getLayer(POLYGON_LABELS_LAYER_ID)) {
        map.addLayer(
          {
            id: POLYGON_LABELS_LAYER_ID,
            type: 'symbol',
            source: POLYGON_LABELS_SOURCE_ID,
            layout: {
              'icon-image': LABEL_PLATE_IMAGE_ID,
              'icon-text-fit': 'both',
              'icon-text-fit-padding': [2, 6, 2, 6],
              'text-field': ['get', 'title'],
              'text-font': ['Frutiger Neue Condensed Regular'],
              'text-size': ['interpolate', ['linear'], ['zoom'], 14, 11, 17, 15],
              'text-max-width': 8,
              'text-padding': 1,
              'symbol-sort-key': ['get', 'rank'],
            },
            paint: { 'text-color': '#2b2622' },
          },
          beneathMarkers(map),
        );
      }

      const updatePolygonFilters = (): void => {
        const zoom = map.getZoom();

        const filter: FilterSpecification = [
          'any',
          ['==', ['get', 'importance'], 'high'],
          ['all', ['==', ['get', 'importance'], 'medium'], zoom >= 14],
          ['all', ['==', ['get', 'importance'], 'low'], zoom >= 16],
        ];

        map.setFilter(POLYGONS_FILL_LAYER_ID, filter);
        map.setFilter(POLYGONS_OUTLINE_LAYER_ID, filter);
        map.setFilter(POLYGONS_WASH_LAYER_ID, filter);
        map.setFilter(POLYGON_LABELS_LAYER_ID, filter);
      };

      updatePolygonFilters();
      map.on('zoom', updatePolygonFilters);

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
        map.addLayer(
          {
            id: SELECTED_POLYGON_LAYER_ID,
            type: 'line',
            source: SELECTED_POLYGON_SOURCE_ID,
            paint: {
              'line-color': '#e11d3c',
              'line-width': 4,
              'line-opacity': 0.9,
            },
          },
          beneathMarkers(map),
        );
      }
    };

    const cleanupLayers = (): void => {
      if (!isStyleReady()) return;

      // Remove the single selection layer and source
      if (map.getLayer(SELECTED_POLYGON_LAYER_ID)) map.removeLayer(SELECTED_POLYGON_LAYER_ID);
      if (map.getSource(SELECTED_POLYGON_SOURCE_ID)) map.removeSource(SELECTED_POLYGON_SOURCE_ID);

      // Remove the batched polygon layers and sources
      if (map.getLayer(POLYGON_LABELS_LAYER_ID)) map.removeLayer(POLYGON_LABELS_LAYER_ID);
      if (map.getSource(POLYGON_LABELS_SOURCE_ID)) map.removeSource(POLYGON_LABELS_SOURCE_ID);
      if (map.getLayer(POLYGONS_WASH_LAYER_ID)) map.removeLayer(POLYGONS_WASH_LAYER_ID);
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

    const labelSource = map.getSource<GeoJSONSource>(POLYGON_LABELS_SOURCE_ID);
    if (labelSource !== undefined) void labelSource.setData(buildLabelCollection(annotations));

    // setData's promise never rejects: failures surface as `error` events on the map
    void sourceTyped.setData({
      type: 'FeatureCollection',
      features: annotations
        .filter((a) => a.geometry.coordinates.length > 0)
        .map((annotation) => ({
          type: 'Feature' as const,
          properties: {
            id: annotation.id,
            title: annotation.title,
            color: formatHexColor(annotation.color),
            isInteractive: annotation.isInteractive,
            importance: annotation.importance,
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

      void sourceTyped.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: coordinates,
        },
      });
    } else {
      // No polygon is selected: clear the source data
      void sourceTyped.setData({
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
      // a tap on a marker opens the marker, not the area it stands in
      const markerLayers = POINT_LAYER_IDS.filter((id) => map.getLayer(id) !== undefined);
      if (
        markerLayers.length > 0 &&
        map.queryRenderedFeatures(event.point, { layers: [...markerLayers] }).length > 0
      ) {
        return;
      }

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
        return;
      }

      // Use the state captured in closure (added to deps) instead of functional update
      // to avoid side-effects (setCurrentAnnotation) inside reducer
      const previousState = clickedPolygonState;

      /* eslint-disable @typescript-eslint/no-unnecessary-condition */
      const sortedClickedPolygons = clickedPolygons.sort((a, b) =>
        (a.id ?? '').localeCompare(b.id ?? ''),
      );
      /* eslint-enable @typescript-eslint/no-unnecessary-condition */
      const currentIds = previousState?.polygons.map((p: CampMapAnnotationPolygon) => p.id).sort();
      const newIds = sortedClickedPolygons.map((p: CampMapAnnotationPolygon) => p.id).sort();

      const isSameSetOfPolygons =
        newIds.length === currentIds?.length &&
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
      }
    };

    map.on('click', handleClick);

    return (): void => {
      map.off('click', handleClick);
    };
  }, [map, annotations, setCurrentAnnotation, clickedPolygonState]);
};
