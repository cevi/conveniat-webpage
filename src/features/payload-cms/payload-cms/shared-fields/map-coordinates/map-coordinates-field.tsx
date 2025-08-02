'use client';

import { useField } from '@payloadcms/ui';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { PointFieldClientComponent } from 'payload';
import { useCallback, useEffect, useRef, useState } from 'react';

const MapCoordinatesField: PointFieldClientComponent = ({ path }) => {
  const { value, setValue } = useField<[number, number] | undefined>({
    path,
  });

  const mapContainerReference = useRef<HTMLDivElement>(null);
  const mapReference = useRef<maplibregl.Map | undefined>(undefined);
  const markerReference = useRef<maplibregl.Marker | undefined>(undefined);

  const [initialLoad, setInitialLoad] = useState(true);
  const [manualLng, setManualLng] = useState<string>(value ? value[0].toFixed(4) : '');
  const [manualLat, setManualLat] = useState<string>(value ? value[1].toFixed(4) : '');

  // Update manual input fields when the map's value changes
  useEffect(() => {
    if (value) {
      setManualLng(value[0].toFixed(4));
      setManualLat(value[1].toFixed(4));
    } else {
      setManualLng('');
      setManualLat('');
    }
  }, [value]);

  const updateMarker = useCallback(
    (lngLat: [number, number]) => {
      if (mapReference.current) {
        if (markerReference.current) {
          markerReference.current.setLngLat(lngLat);
        } else {
          markerReference.current = new maplibregl.Marker({ draggable: true })
            .setLngLat(lngLat)
            .addTo(mapReference.current);

          markerReference.current.on('dragend', () => {
            const newLngLat = markerReference.current?.getLngLat();
            if (!newLngLat) return;
            setValue([newLngLat.lng, newLngLat.lat]);
          });
        }
      }
    },
    [setValue],
  );

  useEffect(() => {
    if (mapContainerReference.current && !mapReference.current) {
      mapReference.current = new maplibregl.Map({
        container: mapContainerReference.current,
        style: '/vector-map/base_style.json',
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        center: [8.301_211, 46.502_822],
        zoom: 15.5,
      });
    }
  }, []);

  useEffect(() => {
    if (mapContainerReference.current && mapReference.current) {
      mapReference.current.on('load', () => {
        setInitialLoad(false);
        if (value) updateMarker(value);
      });

      mapReference.current.on('click', (event) => {
        const newCoordinates: [number, number] = [event.lngLat.lng, event.lngLat.lat];
        setValue(newCoordinates);
        updateMarker(newCoordinates);
      });
    }
  }, [setValue, updateMarker, value]);

  useEffect(() => {
    if (!initialLoad && value) {
      updateMarker(value);
      if (mapReference.current) {
        mapReference.current.flyTo({ center: value, animate: true, duration: 1000 });
      }
    } else if (!initialLoad && !value && markerReference.current) {
      markerReference.current.remove();
      markerReference.current = undefined;
    }
  }, [value, initialLoad, updateMarker]);

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
    <div className="flex flex-col gap-2">
      <label className="text-sm text-gray-600">
        Map Coordinates: {value ? `${value[0].toFixed(4)}, ${value[1].toFixed(4)}` : 'Not set'}
      </label>
      <div
        ref={mapContainerReference}
        style={{ width: '100%', height: '400px', borderRadius: '4px', overflow: 'hidden' }}
        className="border-2 border-gray-200"
      />

      <div className="mt-4 flex flex-col gap-2">
        <label className="text-sm text-gray-600">Manual Input:</label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Longitude"
            value={manualLng}
            onChange={(event) => setManualLng(event.target.value)}
            className="flex-1 rounded-md border border-gray-300 p-2 text-sm"
          />
          <input
            type="text"
            placeholder="Latitude"
            value={manualLat}
            onChange={(event) => setManualLat(event.target.value)}
            className="flex-1 rounded-md border border-gray-300 p-2 text-sm"
          />
          <button
            type="button"
            onClick={handleManualCoordinateChange}
            className="rounded-md border-2 border-blue-800 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Apply
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setValue(undefined)}
        className="rounded-md border-2 border-red-800 bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
      >
        Clear Coordinates
      </button>
    </div>
  );
};

export default MapCoordinatesField;
