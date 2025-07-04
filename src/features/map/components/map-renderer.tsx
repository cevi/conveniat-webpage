'use client';

import { CeviLogo } from '@/components/svg-logos/cevi-logo';
import type {
  CampMapAnnotationPoint,
  CampMapAnnotationPolygon,
  CeviLogoMarker,
  InitialMapPose,
} from '@/features/map/components/types';
import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';
import { reactToDomElement } from '@/utils/react-to-dom-element';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import type { LucideProps } from 'lucide-react';
import { MapPin, Tent, X } from 'lucide-react';
import {
  GeolocateControl,
  Map as MapLibre,
  Marker,
  NavigationControl,
  Popup,
  ScaleControl,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css'; // styles for the map viewer
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
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
      className="absolute bottom-[-2px] left-1/2 h-2 w-2 -translate-x-1/2 rounded-full border border-white"
      style={{ backgroundColor: color }}
    />
  </div>
);

const DynamicLucidIconRenderer: React.FC<{
  icon: CampMapAnnotation['icon'];
  color?: string;
}> = ({ icon, color = '#000000' }): React.JSX.Element => {
  const iconMap: Record<string, React.ElementType<LucideProps>> = {
    MapPin: MapPin,
    Tent: Tent,
  };

  const IconComponent: React.ElementType<LucideProps> =
    icon !== undefined && icon !== null ? (iconMap[icon] ?? MapPin) : MapPin;

  // Fallback if the icon is not recognized
  return (
    <CirclePin color={color}>
      <IconComponent size={24} />
    </CirclePin>
  );
};

// State to manage to cycle through clicked polygons
interface ClickedFeaturesState {
  polygons: CampMapAnnotationPolygon[];
  currentIndex: number;
  clickedPolygonIds: string[];
}

export const MapLibreRenderer = ({
  initialMapPose,
  ceviLogoMarkers,
  campMapAnnotationPoints,
  campMapAnnotationPolygons,
  limitUsage = true,
  validateStyle = true,
}: {
  initialMapPose: InitialMapPose;
  ceviLogoMarkers: CeviLogoMarker[];
  campMapAnnotationPoints: CampMapAnnotationPoint[];
  campMapAnnotationPolygons: CampMapAnnotationPolygon[];
  limitUsage?: boolean;
  validateStyle?: boolean;
}): React.JSX.Element => {
  const mapContainerReference = useRef<HTMLDivElement>(null);
  const mapReference = useRef<MapLibre | null>(null);

  const [openAnnotation, setOpenAnnotation] = useState<
    CampMapAnnotationPoint | CampMapAnnotationPolygon | undefined
  >();
  const [lastClickedFeatures, setLastClickedFeatures] = useState<
    ClickedFeaturesState | undefined
  >();

  const lastClickedFeaturesReference = useRef(lastClickedFeatures);
  useEffect(() => {
    lastClickedFeaturesReference.current = lastClickedFeatures;
  }, [lastClickedFeatures]);

  const closeDrawer = useCallback(() => {
    setOpenAnnotation(undefined);
    setLastClickedFeatures(undefined);

    // remove query parameter from url
    const url = new URL(globalThis.location.href);
    url.searchParams.delete('annotationId');
    globalThis.history.pushState({}, '', url.toString());
  }, []);

  // set default popup based on query parameter
  useEffect(() => {
    const url = new URL(globalThis.location.href);
    const annotationId = url.searchParams.get('annotationId');

    if (annotationId !== null) {
      const annotation =
        campMapAnnotationPoints.find((a) => a.id === annotationId) ??
        campMapAnnotationPolygons.find((a) => a.id === annotationId);
      if (annotation) {
        setOpenAnnotation(annotation);
      }
    }
  }, [campMapAnnotationPoints, campMapAnnotationPolygons]);

  useEffect(() => {
    if (openAnnotation && mapReference.current) {
      let coordinatesToFlyTo: [number, number];

      if (
        'coordinates' in openAnnotation.geometry &&
        Array.isArray(openAnnotation.geometry.coordinates) &&
        typeof openAnnotation.geometry.coordinates[0] === 'number' &&
        typeof openAnnotation.geometry.coordinates[1] === 'number'
      ) {
        coordinatesToFlyTo = [
          openAnnotation.geometry.coordinates[0],
          openAnnotation.geometry.coordinates[1] - 0.0005,
        ];

        mapReference.current.flyTo({
          center: coordinatesToFlyTo,
          zoom: 16.5,
          animate: true,
          duration: 500,
        });
      }
    }
  }, [openAnnotation]);

  // this effect is called ONLY when the component is mounted
  useEffect(() => {
    if (mapReference.current || !mapContainerReference.current) return;

    const { initialMapCenter, zoom } = initialMapPose;

    const geolocate = new GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      trackUserLocation: true,
    });

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
    map_.addControl(geolocate);

    for (const marker of ceviLogoMarkers)
      new Marker({ element: ceviLogoMarkerElementFactory() })
        .setLngLat(marker.geometry.coordinates)
        .addTo(map_);

    for (const annotation of campMapAnnotationPoints) {
      const popup = new Popup();
      popup.on('open', () => {
        setOpenAnnotation(annotation);
        setLastClickedFeatures(undefined);
        const url = new URL(globalThis.location.href);
        url.searchParams.set('annotationId', annotation.id);
        globalThis.history.pushState({}, '', url.toString());
      });

      const marker = new Marker({
        scale: 1.5,
        element: reactToDomElement(
          <DynamicLucidIconRenderer icon={annotation.icon} color={annotation.color} />,
        ),
        anchor: 'bottom',
        offset: [0, -1],
      })
        .setLngLat(annotation.geometry.coordinates)
        .setPopup(popup)
        .addTo(map_);

      marker.getElement().addEventListener('click', (event) => {
        event.stopPropagation();
        marker.togglePopup();
      });
    }

    map_.on('load', () => {
      for (const annotation of campMapAnnotationPolygons) {
        const sourceId = `polygon-${annotation.id}`;
        const layerId = `polygon-layer-${annotation.id}`;

        if (annotation.geometry.coordinates.length === 0) continue;
        const coordinates = [
          [...annotation.geometry.coordinates, annotation.geometry.coordinates[0]],
        ] as unknown as [number, number][][];

        map_.addSource(sourceId, {
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

        map_.addLayer({
          id: layerId,
          type: 'fill',
          source: sourceId,
          paint: { 'fill-color': annotation.color, 'fill-opacity': 0.4 },
        });

        map_.on('mouseenter', layerId, () => {
          map_.getCanvas().style.cursor = 'pointer';
        });
        map_.on('mouseleave', layerId, () => {
          map_.getCanvas().style.cursor = '';
        });
      }

      map_.on('click', (event) => {
        const features = map_.queryRenderedFeatures(event.point, {
          layers: campMapAnnotationPolygons.map((p) => `polygon-layer-${p.id}`),
        });

        const clickedPolygons = campMapAnnotationPolygons.filter((poly) =>
          features.some((feature) => feature.properties['id'] === poly.id),
        );

        if (clickedPolygons.length === 0) {
          setLastClickedFeatures(undefined);
          return;
        }

        // Read the most up-to-date value from the ref
        const currentClickState = lastClickedFeaturesReference.current;

        const currentClickedPolygonIds = currentClickState?.polygons.map((p) => p.id).sort();
        const newClickedPolygonIds = clickedPolygons.map((p) => p.id).sort();

        // Check if the set of clicked polygons is the same as the last click
        const isSameSetOfPolygons =
          currentClickedPolygonIds &&
          newClickedPolygonIds.length === currentClickedPolygonIds.length &&
          newClickedPolygonIds.every((id, index) => id === currentClickedPolygonIds[index]);

        if (
          isSameSetOfPolygons === true &&
          currentClickState !== undefined &&
          currentClickState.polygons.length > 1
        ) {
          const nextIndex =
            (currentClickState.currentIndex + 1) % currentClickState.polygons.length;
          const nextPolygon = currentClickState.polygons[nextIndex];

          if (nextPolygon === undefined) return;

          setOpenAnnotation(nextPolygon);
          setLastClickedFeatures({ ...currentClickState, currentIndex: nextIndex });

          const url = new URL(globalThis.location.href);
          url.searchParams.set('annotationId', nextPolygon.id);
          globalThis.history.pushState({}, '', url.toString());
        } else {
          // If it's a new set of polygons or only one polygon was clicked, start a new cycle
          const firstPolygon = clickedPolygons[0];

          if (firstPolygon === undefined) return;
          setOpenAnnotation(firstPolygon);
          setLastClickedFeatures({
            polygons: clickedPolygons,
            currentIndex: 0,
            clickedPolygonIds: newClickedPolygonIds,
          });

          const url = new URL(globalThis.location.href);
          url.searchParams.set('annotationId', firstPolygon.id);
          globalThis.history.pushState({}, '', url.toString());
        }
      });
    });
  }, [
    initialMapPose,
    ceviLogoMarkers,
    limitUsage,
    validateStyle,
    campMapAnnotationPoints,
    campMapAnnotationPolygons,
  ]);

  return (
    <>
      {openAnnotation && (
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
      )}
      <div className="h-full w-full" ref={mapContainerReference} />
    </>
  );
};

export default MapLibreRenderer;
