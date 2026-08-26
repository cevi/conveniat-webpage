'use client';

// eslint-disable-next-line import/no-restricted-paths -- schedule feature needs to display maps for locations
import { MiniMapLibreRenderer } from '@/features/map/components/map-renderer-wrapper';
// eslint-disable-next-line import/no-restricted-paths -- schedule feature needs types from map
import type { CampMapAnnotationPolygon } from '@/features/map/types/types';
import type { CampMapAnnotation, Image } from '@/features/payload-cms/payload-types';
import { trpc } from '@/trpc/client';
import { i18nConfig, type Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ExternalLink } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import Link from 'next/link';
import React from 'react';

interface ScheduleMiniMapProperties {
  location: CampMapAnnotation;
  /**
   * Sizes the map box, replacing the default fixed height.
   *
   * The schedule detail wants a strip of a known height; the helper portal wants one that keeps
   * its proportions across phone widths. Passing the box in leaves both to the caller rather
   * than growing a second copy of this component.
   */
  className?: string;
  /**
   * Whether the map may be touched at all.
   *
   * A map that answers taps is a map that can be made to say something else: pan away from the
   * shift, open a neighbouring annotation, and what is on screen is no longer the meeting point
   * the page is about. Where the map is there to state a fact rather than to be explored, the
   * "open in map" button is the way out to a map that does respond.
   */
  interactive?: boolean;
}

interface CoordinateObject {
  lat?: number;
  latitude?: number;
  lng?: number;
  longitude?: number;
}

const labels = {
  openInMap: {
    de: 'In Karte öffnen',
    en: 'Open in map',
    fr: 'Ouvrir dans la carte',
  },
} as const;

/**
 * Parse polygon coordinates from various formats to [lng, lat][] format.
 */
function parsePolygonCoordinates(rawCoords: unknown): [number, number][] {
  if (!Array.isArray(rawCoords)) return [];

  return rawCoords
    .map((p: unknown): [number, number] | undefined => {
      if (Array.isArray(p) && typeof p[0] === 'number' && typeof p[1] === 'number') {
        return p as [number, number];
      }
      if (typeof p === 'object' && p !== null) {
        const coord = p as CoordinateObject;
        const lat = coord.lat ?? coord.latitude;
        const lng = coord.lng ?? coord.longitude;
        if (typeof lat === 'number' && typeof lng === 'number') return [lng, lat];
      }
      return undefined;
    })
    .filter((p): p is [number, number] => p !== undefined);
}

/**
 * A mini map component for the schedule details page.
 * Displays the location with a marker/polygon and all other polygons with reduced opacity.
 */
export const ScheduleMiniMap: React.FC<ScheduleMiniMapProperties> = ({
  location,
  className,
  interactive = true,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  // Fetch all polygon annotations for context
  const { data: allAnnotations } = trpc.map.getAnnotations.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,

    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Compute map center - for polygons, calculate centroid from polygon coordinates
  let mapCenter: [number, number] | undefined;

  const currentPolygonCoords =
    location.annotationType === 'polygon'
      ? parsePolygonCoordinates(location.polygonCoordinates)
      : [];

  if (currentPolygonCoords.length > 0) {
    const minLng = Math.min(...currentPolygonCoords.map((c) => c[0]));
    const maxLng = Math.max(...currentPolygonCoords.map((c) => c[0]));
    const minLat = Math.min(...currentPolygonCoords.map((c) => c[1]));
    const maxLat = Math.max(...currentPolygonCoords.map((c) => c[1]));
    mapCenter = [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
  }

  // Fallback to geometry centroid if polygon center couldn't be computed
  if (!mapCenter && location.geometry) {
    mapCenter = location.geometry;
  }

  // If no coordinates, don't render the map
  if (!mapCenter) {
    // eslint-disable-next-line unicorn/no-null -- React components can return null
    return null;
  }

  const [longitude, latitude] = mapCenter;

  // Build polygon annotations - highlighted one first, then others with reduced opacity
  const polygonAnnotations: CampMapAnnotationPolygon[] = [];

  const validImages = location.images?.filter((img): img is Image => typeof img !== 'string') ?? [];

  // Add highlighted (current) polygon
  if (location.annotationType === 'polygon' && currentPolygonCoords.length > 0) {
    polygonAnnotations.push({
      id: location.id,
      title: location.title,
      images: validImages,
      geometry: { coordinates: currentPolygonCoords },
      icon: location.icon,
      color: location.color ?? '#f64955',
      isInteractive: false,
      importance: 'high',
    } as CampMapAnnotationPolygon);
  }

  // Add other polygons with reduced opacity (using their actual color)
  if (allAnnotations?.polygons) {
    for (const polygon of allAnnotations.polygons) {
      if (polygon.id === location.id) continue; // Skip highlighted one
      if (polygon.coordinates.length === 0) continue;

      // Append alpha value to hex color for reduced opacity (40% = 66 in hex)
      const colorWithOpacity = polygon.color.startsWith('#') ? `${polygon.color}66` : polygon.color;

      polygonAnnotations.push({
        id: polygon.id,
        title: polygon.title,
        images: [],
        geometry: { coordinates: polygon.coordinates },
        icon: 'Tent',
        color: colorWithOpacity,
        isInteractive: false,
        importance: 'high',
      } as unknown as CampMapAnnotationPolygon);
    }
  }

  return (
    <div
      className={cn(
        'relative mt-2 w-full overflow-hidden rounded-xl border border-gray-200',
        className,
      )}
      // the inline height is the default only; a caller that sizes the box owns it entirely
      style={className === undefined ? { height: '160px' } : undefined}
    >
      {/* Map container with explicit dimensions */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <MiniMapLibreRenderer
          key={location.id}
          initialMapPose={{
            initialMapCenter: [longitude, latitude],
            zoom: 13.5,
          }}
          ceviLogoMarkers={[]}
          campMapAnnotationPoints={
            location.annotationType === 'marker' && location.geometry
              ? [
                  {
                    id: location.id,
                    title: location.title,
                    description: location.description,
                    openingHours: location.openingHours,
                    images: validImages,
                    geometry: { coordinates: location.geometry },
                    // the colour and the pin glyph come from being the selected annotation,
                    // which this marker always is - see `selectedAnnotationId` below
                    icon: location.icon,
                    color: location.color ?? '#f64955',
                    importance: 'high',
                  },
                ]
              : []
          }
          campMapAnnotationPolygons={polygonAnnotations}
          schedules={{}}
          limitUsage={false}
          mapControlOptions={{
            showSearch: false,
            showNavigation: false,
            showGeolocate: false,
            showScale: false,
          }}
          selectedAnnotationId={location.id}
          hideDrawer
          disableUrlSync
          disableFlyTo
        />
      </div>

      {/*
        Swallows every pointer event before it reaches the map. Sits under the button below,
        which keeps its own higher layer, so the way out to the full map still works.
      */}
      {!interactive && <div className="absolute inset-0 z-[5]" aria-hidden="true" />}

      {/* Overlay Button: Open in Map - styled like maplibregl controls */}
      <div className="absolute top-2 right-2 z-10">
        <Link
          href={`/app/map?locationId=${location.id}`}
          className="flex h-10 w-10 items-center justify-center rounded border border-gray-200 bg-white text-gray-700 shadow-md transition-colors hover:bg-gray-100"
          title={labels.openInMap[locale]}
        >
          <ExternalLink className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
};
