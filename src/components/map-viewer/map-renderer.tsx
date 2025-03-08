'use client';
import React, { useEffect, useRef } from 'react';
import { Map as MapLibre, Marker, NavigationControl, ScaleControl } from 'maplibre-gl';
import { reactToDomElement } from '@/utils/react-to-dom-element';
import { CeviLogo } from '@/components/svg-logos/cevi-logo';

// styles for the map viewer
import 'maplibre-gl/dist/maplibre-gl.css';

/**
 * Interface for the initial map pose.
 * This is used to define the initial center and zoom level of the map.
 */
export interface InitialMapPose {
  initialMapCenter: [number, number];
  zoom: number;
}

/**
 * Interface for a Cevi Logo Marker.
 */
export interface CeviLogoMarker {
  geometry: {
    coordinates: [number, number];
  };
  title: string;
}

/**
 * Factory function to create a DOM element with the Cevi Logo SVG.
 * @returns a DOM element with the Cevi Logo SVG
 */
const ceviLogoMarkerElementFactory = (): HTMLElement =>
  reactToDomElement(<CeviLogo className="h-5 w-5" />);

const minZoomLevelForSwitzerland = 4;

export const MapLibreRenderer = ({
  initialMapPose,
  ceviLogoMarkers,
  limitUsage = true,
}: {
  initialMapPose: InitialMapPose;
  ceviLogoMarkers: CeviLogoMarker[];
  limitUsage?: boolean;
}): React.JSX.Element => {
  const mapContainerReference = useRef<HTMLDivElement>(null);

  // this effect is called when the component is mounted
  useEffect(() => {
    const { initialMapCenter, zoom } = initialMapPose;

    // check if the map container reference
    if (mapContainerReference.current === null) return;

    const map = new MapLibre({
      container: mapContainerReference.current,

      validateStyle: true, // TODO: this should be disabled in production

      // this file defines the map style and layers
      // custom style based on https://api3.geo.admin.ch/services/sdiservices.html#getstyle
      style: '/vector-map/base_style.json',

      // limit map usage
      ...(!limitUsage && {
        cooperativeGestures: true,
        touchZoomRotate: false,
      }),

      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,

      // define initial map pose
      center: initialMapCenter,
      zoom: zoom,

      // restrict map pose to Switzerland
      minZoom: minZoomLevelForSwitzerland,
    });

    map.addControl(new NavigationControl());

    const scale = new ScaleControl({ maxWidth: 80, unit: 'metric' });
    map.addControl(scale);

    ceviLogoMarkers.map((marker) =>
      new Marker({ element: ceviLogoMarkerElementFactory() })
        .setLngLat(marker.geometry.coordinates)
        .addTo(map),
    );
  }, [initialMapPose, ceviLogoMarkers, limitUsage]);

  return <div className="h-full w-full" ref={mapContainerReference} />;
};
