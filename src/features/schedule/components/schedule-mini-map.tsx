'use client';

// eslint-disable-next-line import/no-restricted-paths -- schedule feature needs to display maps for locations
import { MiniMapLibreRenderer } from '@/features/map/components/map-renderer-wrapper';
// eslint-disable-next-line import/no-restricted-paths -- schedule feature needs types from map
import type { CampMapAnnotationPolygon } from '@/features/map/types/types';
import type { CampMapAnnotation, Image } from '@/features/payload-cms/payload-types';
import { trpc } from '@/trpc/client';
import React from 'react';

/** a round white button floating over the map at the top of a block's or a shift's page */
export const floatingButtonClassName =
  'hover:bg-quiet flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white p-0 text-green-900 shadow-[0_2px_8px_rgba(0,0,0,0.16)] transition-colors';

interface CoordinateObject {
  lat?: number;
  latitude?: number;
  lng?: number;
  longitude?: number;
}

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
 * Where a map of the location is centred: the middle of its polygon, else its marker.
 * `undefined` when the location has neither, and then there is no map to show.
 */
export const mapCenterOf = (location: CampMapAnnotation): [number, number] | undefined => {
  const polygon =
    location.annotationType === 'polygon'
      ? parsePolygonCoordinates(location.polygonCoordinates)
      : [];
  if (polygon.length > 0) {
    const longitudes = polygon.map(([longitude]) => longitude);
    const latitudes = polygon.map(([, latitude]) => latitude);
    return [
      (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
      (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
    ];
  }
  return location.geometry ?? undefined;
};

/**
 * The strip of map at the top of a block's or a shift's page: its place, marker or polygon, and
 * the other polygons around it with reduced opacity.
 *
 * It states where the place is and does not answer taps: a map that answers can be panned away
 * from the place, or open a neighbouring one, and then no longer says what the page is about.
 * The place's row in the facts leads to the Karte, which does answer.
 */
export const ScheduleMiniMap: React.FC<{ location: CampMapAnnotation }> = ({ location }) => {
  // Fetch all polygon annotations for context
  const { data: allAnnotations } = trpc.map.getAnnotations.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,

    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const currentPolygonCoords =
    location.annotationType === 'polygon'
      ? parsePolygonCoordinates(location.polygonCoordinates)
      : [];
  const mapCenter = mapCenterOf(location);

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
    // the panel below overlaps the map's bottom edge; the swisstopo credit stays above it
    <div className="relative h-[220px] w-full overflow-hidden [&_.maplibregl-ctrl-bottom-right]:bottom-5">
      {/* Map container with explicit dimensions */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <MiniMapLibreRenderer
          key={location.id}
          initialMapPose={{
            initialMapCenter: [longitude, latitude],
            zoom: 16,
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

      {/* swallows every pointer event before it reaches the map */}
      <div className="absolute inset-0 z-[5]" aria-hidden="true" />
    </div>
  );
};
