import { environmentVariables } from '@/config/environment-variables';
import { MapLibreRenderer } from '@/features/map/components/map-renderer-wrapper';
import type { InitialMapPose } from '@/features/map/types/types';
import type React from 'react';
import 'server-only';

function parseEnvironmentMapCenter(): [number, number] {
  // this may still be undefined during build
  const environmentVariable = environmentVariables.CAMP_MAP_INITIAL_MAP_CENTER as
    string | undefined;
  const parts = environmentVariable?.split('/');
  if (parts?.length !== 2) {
    return [8.301_211, 46.502_822];
  }
  return [Number.parseFloat(parts[0] ?? ''), Number.parseFloat(parts[1] ?? '')];
}

function parseEnvironmentMapBearing(): number {
  // production skips the env validation, so this arrives as a raw string or not at all
  const bearing = Number.parseFloat(String(environmentVariables.CAMP_MAP_INITIAL_BEARING));
  return Number.isNaN(bearing) ? 0 : bearing;
}

const initialMapPoseObergoms: InitialMapPose = {
  initialMapCenter: parseEnvironmentMapCenter(),
  zoom: environmentVariables.CAMP_MAP_INITIAL_ZOOM,
  bearing: parseEnvironmentMapBearing(),
};

/**
 * The camp map. It carries no places: the map reads them, and the programme at each place, from
 * the query cache, which keeps them on the device for offline use and refreshes them in the
 * background. Rendering them here as well sent the whole set a second time inside every copy of
 * this page, the offline one included.
 */
export const CampMapComponent: React.FC = () => (
  <div className="fixed top-[calc(var(--app-header-height)+var(--offline-banner-height,0px))] left-0 h-[calc(100dvh-var(--app-header-height)-var(--offline-banner-height,0px))] w-full pb-(--app-tab-bar-height) xl:left-(--app-content-left) xl:w-[calc(100vw-var(--app-content-left))]">
    <MapLibreRenderer
      initialMapPose={initialMapPoseObergoms}
      ceviLogoMarkers={[]}
      validateStyle={environmentVariables.NODE_ENV !== 'production'}
      mapStyle="/vector-map/camp_style.json"
      enableSearch
    />
  </div>
);
