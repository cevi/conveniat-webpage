'use client';
import { CeviLogo } from '@/components/svg-logos/cevi-logo';
import type {
  CampMapAnnotation,
  CeviLogoMarker,
  InitialMapPose,
} from '@/features/map/components/types';
import { reactToDomElement } from '@/utils/react-to-dom-element';
import type { LucideProps } from 'lucide-react';
import { MapPin, Tent, X } from 'lucide-react';
import { Map as MapLibre, Marker, NavigationControl, Popup, ScaleControl } from 'maplibre-gl';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

// styles for the map viewer
import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ErrorBoundary } from 'react-error-boundary';

/**
 * Factory function to create a DOM element with the Cevi Logo SVG.
 * @returns a DOM element with the Cevi Logo SVG
 */
const ceviLogoMarkerElementFactory = (): HTMLElement =>
  reactToDomElement(<CeviLogo className="h-5 w-5" />);

const minZoomLevelForSwitzerland = 4;

const CirclePin: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
  <div className="relative h-12 w-9">
    <div
      className="absolute top-0 left-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white p-1"
      style={{ backgroundColor: color }}
    >
      {children}
    </div>

    {/* This is your small dot. Its center needs to be on the coordinate. */}
    <div
      className="absolute bottom-[-2px] left-1/2 h-2 w-2 -translate-x-1/2 rounded-full border border-white" // 'border' class provides a 1px border
      style={{ backgroundColor: color }}
    />
  </div>
);

const DynamicLucidIconRenderer: React.FC<{
  icon: CampMapAnnotation['icon'];
  color?: string;
}> = ({ icon, color = '#000000' }): React.JSX.Element => {
  const iconMap: Record<typeof icon, React.ElementType<LucideProps>> = {
    MapPin: MapPin,
    Tent: Tent,
  };

  const IconComponent = iconMap[icon];

  return (
    <CirclePin color={color}>
      <IconComponent color="white" size={20} />
    </CirclePin>
  );
};

export const MapLibreRenderer = ({
  initialMapPose,
  ceviLogoMarkers,
  campMapAnnotation,
  limitUsage = true,
  validateStyle = true,
}: {
  initialMapPose: InitialMapPose;
  ceviLogoMarkers: CeviLogoMarker[];
  campMapAnnotation: CampMapAnnotation[];
  limitUsage?: boolean;
  validateStyle?: boolean;
}): React.JSX.Element => {
  const mapContainerReference = useRef<HTMLDivElement>(null);
  const mapReference = useRef<MapLibre | null>(null);

  const [openAnnotation, setOpenAnnotation] = useState<CampMapAnnotation | undefined>();

  const closeDrawer = useCallback(() => {
    setOpenAnnotation(undefined);
    // remove query parameter from url
    const url = new URL(globalThis.location.href);
    url.searchParams.delete('annotationId');
    globalThis.history.pushState({}, '', url.toString());
  }, []);

  // set default popup based on query parameter
  useEffect(() => {
    const url = new URL(globalThis.location.href);
    const annotationId = url.searchParams.get('annotationId');

    if (annotationId) {
      const annotation = campMapAnnotation.find((a) => a.id === annotationId);
      if (annotation) {
        setOpenAnnotation(annotation);
      }
    }
  }, [campMapAnnotation]);

  // center map to marker on annotation click
  useEffect(() => {
    if (openAnnotation && mapReference.current) {
      // add a small offset to the coordinates to avoid the marker being
      // hidden behind the popup
      const coordinatesWithOffset: [number, number] = [
        openAnnotation.geometry.coordinates[0],
        openAnnotation.geometry.coordinates[1] - 0.0005,
      ];

      mapReference.current.flyTo({
        center: coordinatesWithOffset,
        zoom: 16.5,
        animate: true,
        duration: 500,
      });
    }
  }, [openAnnotation]);

  // this effect is called when the component is mounted
  useEffect(() => {
    if (mapReference.current || !mapContainerReference.current) return;

    const { initialMapCenter, zoom } = initialMapPose;

    const map_ = new MapLibre({
      container: mapContainerReference.current,
      validateStyle,
      style: '/vector-map/base_style.json',
      ...(!limitUsage && {
        cooperativeGestures: true,
        touchZoomRotate: false,
      }),
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      center: initialMapCenter,
      zoom,
      minZoom: minZoomLevelForSwitzerland,
    });

    mapReference.current = map_;
    map_.addControl(new NavigationControl());
    map_.addControl(new ScaleControl({ maxWidth: 80, unit: 'metric' }));

    for (const marker of ceviLogoMarkers)
      new Marker({ element: ceviLogoMarkerElementFactory() })
        .setLngLat(marker.geometry.coordinates)
        .addTo(map_);

    for (const annotation of campMapAnnotation) {
      const popup = new Popup();
      popup.on('open', () => {
        setOpenAnnotation(annotation);
        const url = new URL(globalThis.location.href);
        url.searchParams.set('annotationId', annotation.id);
        globalThis.history.pushState({}, '', url.toString());
      });

      const markerOffset: [number, number] = [0, -1];

      const marker = new Marker({
        scale: 1.5,
        element: reactToDomElement(
          <DynamicLucidIconRenderer icon={annotation.icon} color={annotation.color} />,
        ),
        anchor: 'bottom', // Set the anchor to the bottom of the custom element
        offset: markerOffset, // Apply the offset
      })
        .setLngLat(annotation.geometry.coordinates)
        .setPopup(popup)
        .addTo(map_);

      marker.getElement().addEventListener('click', () => {
        marker.togglePopup();
      });
    }
  }, [initialMapPose, ceviLogoMarkers, limitUsage, validateStyle, campMapAnnotation]);

  return (
    <>
      {openAnnotation && (
        <>
          {/* The fixed-height drawer */}
          <div className="fixed right-0 bottom-0 left-0 z-[999] h-[40vh] overflow-hidden rounded-t-2xl bg-white shadow-2xl">
            <div className="flex h-full flex-col">
              <div className="relative p-4">
                <button
                  className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800"
                  onClick={closeDrawer}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
                <h2 className="pr-8 text-xl font-bold">{openAnnotation.title}</h2>
              </div>

              <div className="overflow-y-auto px-4 pb-4">
                <ErrorBoundary fallback={<div>Error loading annotation</div>}>
                  <LexicalRichTextSection
                    richTextSection={openAnnotation.description as SerializedEditorState}
                  />
                </ErrorBoundary>
              </div>
            </div>
          </div>
        </>
      )}
      <div className="h-full w-full" ref={mapContainerReference} />
    </>
  );
};

export default MapLibreRenderer;
