import { DynamicLucidIconRenderer } from '@/features/map/components/maplibre-renderer/dynamic-lucid-icon-renderer';
import { useMap } from '@/features/map/components/maplibre-renderer/map-context-provider';
import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';
import type { BadgeSize } from '@/features/map/utils/camp-map-images';
import { addBadgeImage, getBadgeImageId } from '@/features/map/utils/camp-map-images';
import { useStar } from '@/hooks/use-star';
import { formatHexColor } from '@/utils/format-hex-color';
import { reactToDomElement } from '@/utils/react-to-dom-element';
import type {
  GeoJSONSource,
  MapLayerMouseEvent,
  Map as MapLibreMap,
  SymbolLayerSpecification,
} from 'maplibre-gl';
import { Marker } from 'maplibre-gl';
import { useEffect } from 'react';

const POINTS_SOURCE_ID = 'annotation-points-source';

/** Markers of high and medium importance, shown at every zoom level. */
export const POINTS_LAYER_ID = 'annotation-points-layer';

/** Markers of low importance: smaller, and only once the map is zoomed into the camp. */
export const MINOR_POINTS_LAYER_ID = 'annotation-points-minor-layer';

export const POINT_LAYER_IDS = [POINTS_LAYER_ID, MINOR_POINTS_LAYER_ID] as const;

/** Zoom level from which markers of low importance are drawn. */
const MINOR_POINTS_MIN_ZOOM = 15.5;

const DEFAULT_MARKER_COLOR = '#78909c';

/** Lower keys are placed first, so they win when two markers would collide. */
const PLACEMENT_RANK: Record<CampMapAnnotationPoint['importance'], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const badgeSizeOf = (annotation: CampMapAnnotationPoint): BadgeSize =>
  annotation.importance === 'low' ? 'small' : 'regular';

const colorOf = (annotation: CampMapAnnotationPoint): string =>
  formatHexColor(annotation.color) ?? DEFAULT_MARKER_COLOR;

const buildFeatureCollection = (
  annotations: CampMapAnnotationPoint[],
  starredEntries: Set<string>,
): GeoJSON.FeatureCollection<GeoJSON.Point> => ({
  type: 'FeatureCollection',
  features: annotations.map((annotation) => ({
    type: 'Feature',
    properties: {
      id: annotation.id,
      // an annotation can opt out of having its title on the map
      label: annotation.showLabel === false ? '' : annotation.title,
      badge: getBadgeImageId({
        icon: annotation.icon,
        color: colorOf(annotation),
        size: badgeSizeOf(annotation),
        isStarred: starredEntries.has(annotation.id),
      }),
      importance: annotation.importance,
      rank: PLACEMENT_RANK[annotation.importance],
    },
    geometry: { type: 'Point', coordinates: annotation.geometry.coordinates },
  })),
});

/**
 * Adds the two marker layers on top of everything else.
 *
 * Every marker is its icon and its name, placed together by MapLibre's collision detection in
 * order of importance: where two would overlap, the less important one is left out, and zooming
 * in makes room for it. That is how any map app keeps a crowded overview readable, and it replaces
 * hiding names below a fixed zoom level, which showed unnamed pins nobody could tell apart.
 */
const addPointLayers = (map: MapLibreMap): void => {
  const text: SymbolLayerSpecification['layout'] = {
    'text-field': ['get', 'label'],
    'text-font': ['Frutiger Neue Italic'],
    'text-size': 14,
    'text-variable-anchor': ['left', 'right', 'top', 'bottom'],
    'text-radial-offset': 1.35,
    'text-justify': 'auto',
    'text-max-width': 9,
    'text-padding': 2,
    'icon-image': ['get', 'badge'],
    'icon-padding': 1,
    'symbol-sort-key': ['get', 'rank'],
  };
  const paint: SymbolLayerSpecification['paint'] = {
    'text-color': '#2b2622',
    'text-halo-color': '#fffdf8',
    'text-halo-width': 2.6,
  };

  map.addLayer({
    id: MINOR_POINTS_LAYER_ID,
    type: 'symbol',
    source: POINTS_SOURCE_ID,
    minzoom: MINOR_POINTS_MIN_ZOOM,
    filter: ['==', ['get', 'importance'], 'low'],
    // a small marker keeps its icon when there is no room for its name
    layout: { ...text, 'text-size': 12, 'text-optional': true },
    paint,
  });
  map.addLayer({
    id: POINTS_LAYER_ID,
    type: 'symbol',
    source: POINTS_SOURCE_ID,
    filter: ['!=', ['get', 'importance'], 'low'],
    layout: text,
    paint,
  });
};

export const useAnnotationPointMarkers = (
  annotations: CampMapAnnotationPoint[],
  currentAnnotation: CampMapAnnotationPoint | CampMapAnnotationPolygon | undefined,
  setCurrentAnnotation: (annotation: CampMapAnnotationPoint | undefined) => void,
): void => {
  const map = useMap();
  const { starredEntries } = useStar();
  const selectedId = currentAnnotation?.id;

  // the markers, as symbol layers; the selected one is drawn separately as a pin
  useEffect(() => {
    if (!map) return;
    let cancelled = false;

    const unselected = annotations.filter((annotation) => annotation.id !== selectedId);

    const update = async (): Promise<void> => {
      await Promise.all(
        unselected.map((annotation) =>
          addBadgeImage(map, {
            icon: annotation.icon,
            color: colorOf(annotation),
            size: badgeSizeOf(annotation),
            isStarred: starredEntries.has(annotation.id),
          }),
        ),
      );
      if (cancelled) return;

      const data = buildFeatureCollection(unselected, starredEntries);
      const source = map.getSource<GeoJSONSource>(POINTS_SOURCE_ID);
      if (source === undefined) {
        map.addSource(POINTS_SOURCE_ID, { type: 'geojson', data });
        addPointLayers(map);
      } else {
        void source.setData(data);
      }
    };

    const run = (): void => {
      update().catch((error: unknown) => {
        console.error('Drawing the map markers failed:', error);
      });
    };

    // `isStyleLoaded` is false while tiles are still loading, long after `load` has fired, so a
    // map that is not ready yet is waited for until it next settles
    if (map.isStyleLoaded() === true) run();
    else map.once('idle', run);

    return (): void => {
      cancelled = true;
      map.off('idle', run);
    };
  }, [map, annotations, selectedId, starredEntries]);

  // the selected annotation, drawn as a dropped pin with its name
  useEffect(() => {
    if (!map) return;
    const selected = annotations.find((annotation) => annotation.id === selectedId);
    if (selected === undefined) return;

    const element = reactToDomElement(
      <DynamicLucidIconRenderer
        icon={selected.icon}
        color={selected.color}
        isSelected
        label={selected.showLabel === false ? undefined : selected.title}
      />,
    );
    element.id = `marker-${selected.id}`;
    const marker = new Marker({ element, anchor: 'bottom' })
      .setLngLat(selected.geometry.coordinates)
      .addTo(map);

    return (): void => {
      marker.remove();
    };
  }, [map, annotations, selectedId]);

  // opening an annotation by tapping its marker
  useEffect(() => {
    if (!map) return;

    const handleClick = (event: MapLayerMouseEvent): void => {
      const id: unknown = event.features?.[0]?.properties['id'];
      const annotation = annotations.find((candidate) => candidate.id === id);
      if (annotation !== undefined) setCurrentAnnotation(annotation);
    };
    const showPointer = (): void => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const resetPointer = (): void => {
      map.getCanvas().style.cursor = '';
    };

    for (const layerId of POINT_LAYER_IDS) {
      map.on('click', layerId, handleClick);
      map.on('mouseenter', layerId, showPointer);
      map.on('mouseleave', layerId, resetPointer);
    }

    return (): void => {
      for (const layerId of POINT_LAYER_IDS) {
        map.off('click', layerId, handleClick);
        map.off('mouseenter', layerId, showPointer);
        map.off('mouseleave', layerId, resetPointer);
      }
    };
  }, [map, annotations, setCurrentAnnotation]);
};
