'use client';
import { CeviLogo } from '@/components/svg-logos/cevi-logo';
import type { CeviLogoMarker, InitialMapPose } from '@/features/map/components/types';
import { reactToDomElement } from '@/utils/react-to-dom-element';
import { Map as MapLibre, Marker, NavigationControl, ScaleControl } from 'maplibre-gl';
import type React from 'react';
import { useEffect, useRef } from 'react';

// styles for the map viewer
import 'maplibre-gl/dist/maplibre-gl.css';

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
  validateStyle = true,
}: {
  initialMapPose: InitialMapPose;
  ceviLogoMarkers: CeviLogoMarker[];
  limitUsage?: boolean;
  validateStyle?: boolean;
}): React.JSX.Element => {
  const mapContainerReference = useRef<HTMLDivElement>(null);

  // this effect is called when the component is mounted
  useEffect(() => {
    const { initialMapCenter, zoom } = initialMapPose;

    // check if the map container reference
    if (mapContainerReference.current === null) return;

    const map = new MapLibre({
      container: mapContainerReference.current,

      validateStyle: validateStyle,

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
  }, [initialMapPose, ceviLogoMarkers, limitUsage, validateStyle]);

  return <div className="h-full w-full" ref={mapContainerReference} />;
};

export default MapLibreRenderer;
