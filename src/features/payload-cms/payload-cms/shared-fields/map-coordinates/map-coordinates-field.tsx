'use client';

import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';
import { useDocumentInfo, useField } from '@payloadcms/ui';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { PointFieldClientComponent } from 'payload';
import { useCallback, useEffect, useRef, useState } from 'react';

import { DynamicLucidIconRenderer } from '@/features/map/components/maplibre-renderer/dynamic-lucid-icon-renderer';
import { formatHexColor } from '@/utils/format-hex-color';
import { reactToDomElement } from '@/utils/react-to-dom-element';
import { Check, ChevronDown, ChevronUp, MapPin, Settings2, Trash2 } from 'lucide-react';

const MapCoordinatesField: PointFieldClientComponent = ({ path }) => {
  const { value, setValue } = useField<[number, number] | undefined>({
    path,
  });
  const { id: documentId } = useDocumentInfo();
  const { value: color } = useField<string | undefined>({ path: 'color' });
  const { value: icon } = useField<string | undefined>({ path: 'icon' });

  const mapContainerReference = useRef<HTMLDivElement>(null);
  const mapReference = useRef<maplibregl.Map | undefined>(undefined);
  const markerReference = useRef<maplibregl.Marker | undefined>(undefined);
  const [annotations, setAnnotations] = useState<CampMapAnnotation[]>([]);
  const [showManualInput, setShowManualInput] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update manual input fields when the map's value changes
  const [manualLng, setManualLng] = useState<string>(value ? value[0].toFixed(4) : '');
  const [manualLat, setManualLat] = useState<string>(value ? value[1].toFixed(4) : '');

  // This state tracks the "value" that manualLng and manualLat are currently in sync with.
  const [syncedValue, setSyncedValue] = useState(value);

  // This is the fix:
  // We check if the external 'value' has changed since our last sync.
  if (value !== syncedValue) {
    // If it has (e.g., from a map click), we force our local state
    // to update *during this render*.
    setManualLng(value ? value[0].toFixed(4) : '');
    setManualLat(value ? value[1].toFixed(4) : '');
    // We also update our tracker to this new value.
    setSyncedValue(value);
  }

  const updateMarker = useCallback(
    (lngLat: [number, number]) => {
      if (!mapReference.current) return;

      const hexColor = formatHexColor(color);
      const markerElement = reactToDomElement(
        <DynamicLucidIconRenderer
          icon={icon as CampMapAnnotation['icon']}
          {...(hexColor ? { color: hexColor } : {})}
        />,
      );
      markerElement.style.width = 'fit-content';
      markerElement.style.display = 'block';

      if (markerReference.current) {
        markerReference.current.setLngLat(lngLat);
        // Replace current marker element to reflect color/icon changes
        const currentElement = markerReference.current.getElement();
        currentElement.innerHTML = markerElement.innerHTML;
        // Also update style of the existing element to ensure it's fit-content
        currentElement.style.width = 'fit-content';
        currentElement.style.display = 'block';
      } else {
        markerReference.current = new maplibregl.Marker({
          element: markerElement,
          draggable: true,
          anchor: 'bottom',
        })
          .setLngLat(lngLat)
          .addTo(mapReference.current);

        markerReference.current.on('dragend', () => {
          const newLngLat = markerReference.current?.getLngLat();
          if (!newLngLat) return;
          setValue([newLngLat.lng, newLngLat.lat]);
        });
      }
    },
    [setValue, icon, color],
  );

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

    // Clear existing markers
    for (const marker of contextMarkersReference.current) {
      marker.remove();
    }
    contextMarkersReference.current = [];

    // Remove existing context layers if any
    if (map.getLayer('context-polygons-fill')) map.removeLayer('context-polygons-fill');
    if (map.getLayer('context-polygons-outline')) map.removeLayer('context-polygons-outline');
    if (map.getSource('context-source')) map.removeSource('context-source');

    const polygonFeatures: GeoJSON.Feature[] = [];

    for (const item of items) {
      if (item.annotationType === 'polygon' && item.polygonCoordinates) {
        const rawCoords = item.polygonCoordinates as unknown as {
          longitude: number;
          latitude: number;
        }[];
        const coordinates: [number, number][] = rawCoords.map((c) => [c.longitude, c.latitude]);
        polygonFeatures.push({
          type: 'Feature',
          properties: { color: item.color ?? '#78909c' },
          geometry: {
            type: 'Polygon',
            coordinates: [coordinates],
          },
        });
      } else if (item.annotationType === 'marker' && item.geometry) {
        // Create a marker for each context point using the frontend's visual approach
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

      map.on('load', () => {
        setMapLoaded(true);
      });

      map.on('click', (event: maplibregl.MapMouseEvent) => {
        const newCoordinates: [number, number] = [event.lngLat.lng, event.lngLat.lat];
        setValue(newCoordinates);
        updateMarker(newCoordinates);
      });
    }

    return (): void => {
      if (mapReference.current) {
        mapReference.current.remove();
        mapReference.current = undefined;
        markerReference.current = undefined;
        setMapLoaded(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Map initialization should only run once on mount; setValue/updateMarker are stable callbacks
  }, [mounted]); // Run after mount to ensure container is available

  // Consolidate markers/context updates into one state-responsive effect
  useEffect(() => {
    if (mapReference.current && mapLoaded) {
      // Sync context annotations (other markers/polygons)
      renderContext(mapReference.current, annotations);

      // Sync primary marker
      if (value) {
        updateMarker(value);
      } else if (markerReference.current) {
        markerReference.current.remove();
        markerReference.current = undefined;
      }
    }
  }, [mapLoaded, annotations, renderContext, value, color, icon, updateMarker]);

  const handleManualCoordinateChange = (): void => {
    const parsedLng = Number.parseFloat(manualLng);
    const parsedLat = Number.parseFloat(manualLat);

    if (!Number.isNaN(parsedLng) && !Number.isNaN(parsedLat)) {
      const newCoordinates: [number, number] = [parsedLng, parsedLat];
      setValue(newCoordinates);
      updateMarker(newCoordinates);
      if (mapReference.current) {
        mapReference.current.flyTo({ center: newCoordinates, animate: true, duration: 1000 });
      }
    } else {
      // Optionally provide feedback to the user about invalid input
      console.warn('Invalid longitude or latitude input.');
    }
  };

  return (
    <>
      <div className="flex items-center justify-between rounded-t-md border border-gray-200 bg-gray-50 p-1 px-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-gray-500 uppercase">
          <MapPin size={14} className="text-blue-500" />
          Marker Coordinates
        </span>
        <div className="flex items-center gap-2">
          {value && (
            <button
              type="button"
              onClick={() => setValue(undefined)}
              className="flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-600 shadow-sm transition-colors hover:bg-red-50"
            >
              <Trash2 size={12} />
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowManualInput(!showManualInput)}
            className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
          >
            <Settings2 size={12} />
            Manual Input
            {showManualInput ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>
      <div
        ref={mapContainerReference}
        style={{ width: '100%', height: '400px', borderRadius: '0', overflow: 'hidden' }}
        className="border-x-2 border-gray-200"
      />

      {showManualInput && (
        <div className="flex flex-col gap-3 rounded-b-md border-x-2 border-b-2 border-gray-200 bg-gray-50 p-3">
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1">
              <span className="ml-1 text-[10px] font-bold text-gray-400 uppercase">Longitude</span>
              <input
                type="text"
                placeholder="0.0000"
                value={manualLng}
                onChange={(event) => setManualLng(event.target.value)}
                className="w-full rounded-md border border-gray-300 p-2 text-sm shadow-inner transition-all outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <span className="ml-1 text-[10px] font-bold text-gray-400 uppercase">Latitude</span>
              <input
                type="text"
                placeholder="0.0000"
                value={manualLat}
                onChange={(event) => setManualLat(event.target.value)}
                className="w-full rounded-md border border-gray-300 p-2 text-sm shadow-inner transition-all outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1 pt-4">
              <button
                type="button"
                onClick={handleManualCoordinateChange}
                className="flex h-[38px] items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-blue-700 active:bg-blue-800"
              >
                <Check size={16} />
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
      {!showManualInput && (
        <div className="h-2 rounded-b-md border-x-2 border-b-2 border-gray-200 bg-gray-100" />
      )}

      <div className="mt-1 flex items-center justify-between px-1 text-[11px] font-medium text-gray-500">
        <span>
          Set the exact location of the marker on the map by clicking or dragging the pin.
        </span>
        <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-400">
          {value ? `${value[0].toFixed(6)}, ${value[1].toFixed(6)}` : 'Location not set'}
        </span>
      </div>
    </>
  );
};

export default MapCoordinatesField;
