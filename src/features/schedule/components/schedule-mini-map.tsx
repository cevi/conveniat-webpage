'use client';

// eslint-disable-next-line import/no-restricted-paths -- schedule feature needs to display maps for locations
import { MapLibreRenderer } from '@/features/map/components/map-renderer-wrapper';
import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

interface ScheduleMiniMapProperties {
  location: CampMapAnnotation;
}

/**
 * A mini map component for the schedule details page.
 * Displays the location with a marker and provides a link to the main map.
 */
export const ScheduleMiniMap: React.FC<ScheduleMiniMapProperties> = ({ location }) => {
  const coordinates = location.geometry?.coordinates;

  // If no coordinates, don't render the map
  if (!coordinates) {
    return;
  }

  const [longitude, latitude] = coordinates;

  return (
    <div
      className="relative mt-2 w-full overflow-hidden rounded-xl border border-gray-200"
      style={{ height: '160px' }}
    >
      {/* Map container with explicit dimensions */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <MapLibreRenderer
          initialMapPose={{
            initialMapCenter: [longitude, latitude],
            zoom: 15,
          }}
          ceviLogoMarkers={[
            {
              geometry: { coordinates: [longitude, latitude] },
              title: location.title,
            },
          ]}
          schedules={{}}
          limitUsage={false}
          mapControlOptions={{
            showSearch: false,
            showNavigation: false,
            showGeolocate: false,
            showScale: false,
          }}
        />
      </div>

      {/* Overlay Button: Open in Map - styled like maplibregl controls */}
      <div className="absolute top-2 right-2 z-10">
        <Link
          href={`/app/map?locationId=${location.id}`}
          className="flex h-10 w-10 items-center justify-center rounded border border-gray-200 bg-white text-gray-700 shadow-md transition-colors hover:bg-gray-100"
          title="In Karte öffnen"
        >
          <ExternalLink className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
};
