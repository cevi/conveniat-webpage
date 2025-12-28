'use client';

import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { useDocumentInfo, useField } from '@payloadcms/ui';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FieldClientComponent } from 'payload';
import { useCallback, useEffect, useRef, useState } from 'react';

import { DynamicLucidIconRenderer } from '@/features/map/components/maplibre-renderer/dynamic-lucid-icon-renderer';
import { reactToDomElement } from '@/utils/react-to-dom-element';
import { Hexagon, Trash2 } from 'lucide-react';

const MAPBOX_DRAW_THEME = [
  {
    id: 'gl-draw-polygon-fill-inactive',
    type: 'fill',
    filter: [
      'all',
      ['==', 'active', 'false'],
      ['==', '$type', 'Polygon'],
      ['!=', 'mode', 'static'],
    ],
    paint: {
      'fill-color': '#3bb2d0',
      'fill-outline-color': '#3bb2d0',
      'fill-opacity': 0.1,
    },
  },
  {
    id: 'gl-draw-polygon-fill-active',
    type: 'fill',
    filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
    paint: {
      'fill-color': '#fbb03b',
      'fill-outline-color': '#fbb03b',
      'fill-opacity': 0.1,
    },
  },
  {
    id: 'gl-draw-polygon-mid-active',
    type: 'line',
    filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': '#fbb03b',
      'line-dasharray': ['literal', [0.2, 2]],
      'line-width': 2,
    },
  },
  {
    id: 'gl-draw-polygon-stroke-inactive',
    type: 'line',
    filter: [
      'all',
      ['==', 'active', 'false'],
      ['==', '$type', 'Polygon'],
      ['!=', 'mode', 'static'],
    ],
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': '#3bb2d0',
      'line-width': 2,
    },
  },
  {
    id: 'gl-draw-polygon-stroke-active',
    type: 'line',
    filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': '#fbb03b',
      'line-dasharray': ['literal', [0.2, 2]],
      'line-width': 2,
    },
  },
  {
    id: 'gl-draw-line-inactive',
    type: 'line',
    filter: [
      'all',
      ['==', 'active', 'false'],
      ['==', '$type', 'LineString'],
      ['!=', 'mode', 'static'],
    ],
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': '#3bb2d0',
      'line-width': 2,
    },
  },
  {
    id: 'gl-draw-line-active',
    type: 'line',
    filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'LineString']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': '#fbb03b',
      'line-dasharray': ['literal', [0.2, 2]],
      'line-width': 2,
    },
  },
  {
    id: 'gl-draw-polygon-and-line-vertex-stroke-inactive',
    type: 'circle',
    filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
    paint: {
      'circle-radius': 5,
      'circle-color': '#fff',
    },
  },
  {
    id: 'gl-draw-polygon-and-line-vertex-inactive',
    type: 'circle',
    filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
    paint: {
      'circle-radius': 3,
      'circle-color': '#fbb03b',
    },
  },
  {
    id: 'gl-draw-point-point-stroke-inactive',
    type: 'circle',
    filter: [
      'all',
      ['==', 'active', 'false'],
      ['==', '$type', 'Point'],
      ['==', 'meta', 'feature'],
      ['!=', 'mode', 'static'],
    ],
    paint: {
      'circle-radius': 5,
      'circle-color': '#fff',
    },
  },
  {
    id: 'gl-draw-point-inactive',
    type: 'circle',
    filter: [
      'all',
      ['==', 'active', 'false'],
      ['==', '$type', 'Point'],
      ['==', 'meta', 'feature'],
      ['!=', 'mode', 'static'],
    ],
    paint: {
      'circle-radius': 3,
      'circle-color': '#3bb2d0',
    },
  },
  {
    id: 'gl-draw-point-stroke-active',
    type: 'circle',
    filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Point']],
    paint: {
      'circle-radius': 7,
      'circle-color': '#fff',
    },
  },
  {
    id: 'gl-draw-point-active',
    type: 'circle',
    filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Point']],
    paint: {
      'circle-radius': 5,
      'circle-color': '#fbb03b',
    },
  },
  {
    id: 'gl-draw-polygon-fill-static',
    type: 'fill',
    filter: ['all', ['==', 'mode', 'static'], ['==', '$type', 'Polygon']],
    paint: {
      'fill-color': '#404040',
      'fill-outline-color': '#404040',
      'fill-opacity': 0.1,
    },
  },
  {
    id: 'gl-draw-polygon-stroke-static',
    type: 'line',
    filter: ['all', ['==', 'mode', 'static'], ['==', '$type', 'Polygon']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': '#404040',
      'line-width': 2,
    },
  },
  {
    id: 'gl-draw-line-static',
    type: 'line',
    filter: ['all', ['==', 'mode', 'static'], ['==', '$type', 'LineString']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': '#404040',
      'line-width': 2,
    },
  },
  {
    id: 'gl-draw-point-static',
    type: 'circle',
    filter: ['all', ['==', 'mode', 'static'], ['==', '$type', 'Point']],
    paint: {
      'circle-radius': 5,
      'circle-color': '#404040',
    },
  },
];

interface PolygonCoordinate {
  latitude: number;
  longitude: number;
  id?: string | null;
}

const MapPolygonField: FieldClientComponent = ({ path }) => {
  const { value, setValue } = useField<PolygonCoordinate[] | undefined>({ path: path as string });
  const { id: documentId } = useDocumentInfo();
  const { value: color } = useField<string | undefined>({ path: 'color' });

  const mapContainerReference = useRef<HTMLDivElement>(null);
  const mapReference = useRef<maplibregl.Map | undefined>(undefined);
  const drawReference = useRef<MapboxDraw | undefined>(undefined);
  const [annotations, setAnnotations] = useState<CampMapAnnotation[]>([]);
  const [mounted, setMounted] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const initialSyncReference = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch all annotations for context
  useEffect(() => {
    fetch('/api/camp-map-annotations?limit=100')
      .then((response) => response.json() as Promise<{ docs?: CampMapAnnotation[] }>)
      .then((data) => {
        if (data.docs) {
          setAnnotations(
            data.docs.filter((document_: CampMapAnnotation) => document_.id !== documentId),
          );
        }
      })
      .catch((error: unknown) => console.error('Failed to fetch annotations', error));
  }, [documentId]);

  const contextMarkersReference = useRef<maplibregl.Marker[]>([]);

  const renderContext = useCallback((map: maplibregl.Map, items: CampMapAnnotation[]): void => {
    const isStyleReady = (): boolean => {
      try {
        return map.isStyleLoaded() === true;
      } catch {
        return false;
      }
    };

    if (!isStyleReady()) return;

    for (const marker of contextMarkersReference.current) {
      marker.remove();
    }
    contextMarkersReference.current = [];

    if (map.getLayer('context-polygons-fill')) map.removeLayer('context-polygons-fill');
    if (map.getLayer('context-polygons-outline')) map.removeLayer('context-polygons-outline');
    if (map.getSource('context-source')) map.removeSource('context-source');

    const polygonFeatures: GeoJSON.Feature[] = [];

    for (const item of items) {
      if (item.annotationType === 'polygon' && item.polygonCoordinates) {
        const coordinates = (item.polygonCoordinates as unknown as PolygonCoordinate[]).map((c) => [
          c.longitude,
          c.latitude,
        ]);
        polygonFeatures.push({
          type: 'Feature',
          properties: { color: item.color ?? '#78909c' },
          geometry: {
            type: 'Polygon',
            coordinates: [coordinates],
          },
        });
      } else if (item.annotationType === 'marker' && item.geometry) {
        const markerElement = reactToDomElement(
          <DynamicLucidIconRenderer
            icon={item.icon}
            {...(item.color ? { color: item.color } : {})}
          />,
        );
        markerElement.style.width = 'fit-content';
        markerElement.style.display = 'block';
        markerElement.style.opacity = '0.5';
        markerElement.style.transition = 'opacity 0.2s';
        markerElement.className = 'context-marker-icon';

        const marker = new maplibregl.Marker({ element: markerElement, anchor: 'bottom' })
          .setLngLat(item.geometry)
          .addTo(map);

        contextMarkersReference.current.push(marker);
      }
    }

    if (polygonFeatures.length > 0) {
      map.addSource('context-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: polygonFeatures,
        },
      });

      map.addLayer({
        id: 'context-polygons-fill',
        type: 'fill',
        source: 'context-source',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.3,
        },
      });

      map.addLayer({
        id: 'context-polygons-outline',
        type: 'line',
        source: 'context-source',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2,
          'line-opacity': 0.5,
        },
      });
    }
  }, []);

  // 1. Context Sync Effect: Renders other annotations (background layer)
  // Separated to prevent re-rendering when the current polygon (value) changes.
  useEffect(() => {
    if (!mapReference.current || !mapLoaded) return;
    renderContext(mapReference.current, annotations);
  }, [mapLoaded, annotations, renderContext]);

  // 2. Style Sync Effect: Updates draw layer colors
  useEffect(() => {
    if (!mapReference.current || !mapLoaded) return;
    const map = mapReference.current;

    const activeColor = color || '#fbb03b';
    const inactiveColor = color || '#3bb2d0';

    const themeLayers = [
      { id: 'gl-draw-polygon-fill-inactive', type: 'fill', color: inactiveColor },
      { id: 'gl-draw-polygon-fill-active', type: 'fill', color: activeColor },
      { id: 'gl-draw-polygon-mid-active', type: 'line', color: activeColor },
      { id: 'gl-draw-polygon-stroke-inactive', type: 'line', color: inactiveColor },
      { id: 'gl-draw-polygon-stroke-active', type: 'line', color: activeColor },
      { id: 'gl-draw-line-inactive', type: 'line', color: inactiveColor },
      { id: 'gl-draw-line-active', type: 'line', color: activeColor },
      { id: 'gl-draw-polygon-and-line-vertex-inactive', type: 'circle', color: activeColor },
      { id: 'gl-draw-point-inactive', type: 'circle', color: inactiveColor },
      { id: 'gl-draw-point-active', type: 'circle', color: activeColor },
    ];

    for (const layerDefinition of themeLayers) {
      for (const suffix of ['.hot', '.cold']) {
        const layerId = `${layerDefinition.id}${suffix}`;
        if (map.getLayer(layerId)) {
          switch (layerDefinition.type) {
            case 'fill': {
              map.setPaintProperty(layerId, 'fill-color', layerDefinition.color);
              map.setPaintProperty(layerId, 'fill-outline-color', layerDefinition.color);

              break;
            }
            case 'line': {
              map.setPaintProperty(layerId, 'line-color', layerDefinition.color);

              break;
            }
            case 'circle': {
              map.setPaintProperty(layerId, 'circle-color', layerDefinition.color);

              break;
            }
            // No default
          }
        }
      }
    }
  }, [mapLoaded, color]);

  // 3. Initial Data Sync Effect
  useEffect(() => {
    if (!mapReference.current || !mapLoaded || !drawReference.current) return;

    const map = mapReference.current;
    const draw = drawReference.current;

    // Initial polygon load or recovery
    if (!initialSyncReference.current) {
      if (value && value.length >= 3) {
        // Ensure ring closure for valid GeoJSON Polygon
        const rawCoords = value.map((v: PolygonCoordinate) => [v.longitude, v.latitude]);
        const firstCoord = rawCoords[0];
        const lastCoord = rawCoords.at(-1);

        if (
          rawCoords.length > 0 &&
          firstCoord &&
          lastCoord &&
          (firstCoord[0] !== lastCoord[0] || firstCoord[1] !== lastCoord[1])
        ) {
          rawCoords.push(firstCoord);
        }

        const featureCollection: GeoJSON.FeatureCollection<GeoJSON.Polygon> = {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Polygon',
                coordinates: [rawCoords],
              },
            },
          ],
        };

        // Force-set data to ensure visual consistency
        draw.set(featureCollection);

        // Switch to select mode to allow editing existing polygon
        const firstFeature = draw.getAll().features[0];
        if (draw.getMode() !== 'simple_select' && firstFeature?.id) {
          draw.changeMode('simple_select', { featureIds: [firstFeature.id as string] });
        }

        const lats = value.map((v: PolygonCoordinate) => v.latitude);
        const lngs = value.map((v: PolygonCoordinate) => v.longitude);
        map.fitBounds(
          [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
          ],
          { padding: 40, duration: 0 },
        );
      } else {
        // If empty, ensure we are in draw mode
        draw.deleteAll();
        if (draw.getMode() !== 'draw_polygon') {
          draw.changeMode('draw_polygon');
        }
      }
      initialSyncReference.current = true;
    }
  }, [mapLoaded, value]);

  useEffect(() => {
    if (mapContainerReference.current && !mapReference.current) {
      const map = new maplibregl.Map({
        container: mapContainerReference.current,
        style: '/vector-map/base_style.json',
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        center: [8.301_211, 46.502_822],
        zoom: 15.5,
        validateStyle: false,
      });

      mapReference.current = map;

      const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: false,
          trash: false,
        },
        defaultMode: 'draw_polygon',
        styles: MAPBOX_DRAW_THEME,
      });

      drawReference.current = draw;
      map.addControl(draw as unknown as maplibregl.IControl);

      const syncValue = (): void => {
        // Prevent syncing if the map isn't ready or hasn't had a chance to load initial data
        if (!map.isStyleLoaded()) {
          console.log('[MapPolygonField] Sync blocked: Style not loaded');
          return;
        }

        const data = draw.getAll();
        console.log('[MapPolygonField] Sync Triggered. Features:', data.features.length);
        if (data.features.length > 0) {
          const feature = data.features[0];
          if (feature?.geometry.type === 'Polygon') {
            const coords = feature.geometry.coordinates[0] as [number, number][] | undefined;
            if (coords) {
              setValue(
                coords.map((c) => ({
                  longitude: c[0],
                  latitude: c[1],
                })),
              );
            }
          }
        } else {
          setValue(undefined);
        }
      };

      map.on('draw.create', syncValue);
      map.on('draw.delete', syncValue);
      map.on('draw.update', syncValue);

      map.on('load', () => {
        setMapLoaded(true);
      });

      // Update cursor based on draw mode
      const updateCursor = (): void => {
        const mode = draw.getMode();
        if (mode === 'draw_polygon') {
          map.getCanvas().style.cursor = 'crosshair';
        } else {
          map.getCanvas().style.cursor = '';
        }
      };

      map.on('draw.modechange', updateCursor);
      // Initial cursor check
      updateCursor();

      // Right-click to undo last point
      const handleContextMenu = (event: MouseEvent): void => {
        event.preventDefault();
        // Dispatch a backspace key event to the map container to trigger MapboxDraw's undo
        const backspaceEvent = new KeyboardEvent('keydown', {
          key: 'Backspace',
          code: 'Backspace',
          keyCode: 8,
          bubbles: true,
        });
        map.getContainer().dispatchEvent(backspaceEvent);
      };

      const container = map.getContainer();
      container.addEventListener('contextmenu', handleContextMenu);
    }

    return (): void => {
      if (mapReference.current) {
        mapReference.current.remove();
        mapReference.current = undefined;
        setMapLoaded(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between rounded-t-md border border-gray-200 bg-gray-50 p-1 px-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-gray-500 uppercase">
          <Hexagon size={14} className="text-blue-500" />
          Polygon Editor
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (drawReference.current) {
                drawReference.current.deleteAll();
                drawReference.current.changeMode('draw_polygon');
                setValue(undefined);
              }
            }}
            className="flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-600 shadow-sm transition-colors hover:bg-red-50"
          >
            <Trash2 size={12} />
            Clear Polygon
          </button>
          <div className="mx-1 h-4 w-px bg-gray-200" />
          <span className="font-mono text-[10px] text-gray-400">
            {value ? `${value.length} points` : 'No polygon'}
          </span>
        </div>
      </div>
      <div
        ref={mapContainerReference}
        style={{
          width: '100%',
          height: '500px',
          borderRadius: '0 0 4px 4px',
          overflow: 'hidden',
        }}
        className="border-2 border-t-0 border-gray-200"
      />
      <div className="flex items-center justify-between px-1 text-[11px] font-medium text-emerald-600">
        <span className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Draw mode active - click on map to start. Right click to undo last point. Double click to
          close.
        </span>
      </div>
    </div>
  );
};

export default MapPolygonField;
