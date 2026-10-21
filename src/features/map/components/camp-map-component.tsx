import { AppAdvertisement } from '@/components/app-advertisement';
import { environmentVariables } from '@/config/environment-variables';
import { loadMapAnnotations } from '@/features/map/api/load-map-annotations';
import { MapLibreRenderer } from '@/features/map/components/map-renderer-wrapper';
import type { InitialMapPose } from '@/features/map/types/types';
import type { Locale } from '@/types/types';
import config from '@payload-config';
import { cacheLife, cacheTag } from 'next/cache';
import { getPayload } from 'payload';
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
 * Cached body of the camp map.
 *
 * Takes the *resolved* locale rather than a Promise. A Promise is a new object identity on every
 * render, so passing one as an argument to a `'use cache'` function makes the cache key
 * non-deterministic: the entry written during the cache-warming pass is never found again during
 * the final prerender pass, which surfaces as "Unexpected cache miss after cache warming phase
 * during prerendering" and re-runs the whole (DB-heavy) render.
 */
const CampMapComponentCached: React.FC<{
  locale: Locale;
}> = async ({ locale }) => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'camp-map-annotations', 'camp-schedule-entry');

  const payload = await getPayload({ config });

  const { campMapAnnotationPoints, campMapAnnotationPolygons, schedules } =
    await loadMapAnnotations(payload, locale);

  return (
    <>
      <div className="fixed top-[60px] left-0 h-[calc(100dvh-60px)] w-full pb-20 xl:left-[480px] xl:w-[calc(100vw-480px)]">
        <MapLibreRenderer
          initialMapPose={initialMapPoseObergoms}
          ceviLogoMarkers={[]}
          campMapAnnotationPoints={campMapAnnotationPoints}
          campMapAnnotationPolygons={campMapAnnotationPolygons}
          validateStyle={environmentVariables.NODE_ENV !== 'production'}
          mapStyle="/vector-map/camp_style.json"
          schedules={schedules}
          enableSearch
        />
      </div>

      {/* advertisement for app, hidden if already in app mode */}
      <AppAdvertisement locale={locale} />
    </>
  );
};

/**
 * Resolves the locale Promise outside of the cached scope, so the cached render below is keyed on
 * a plain, deterministic string.
 */
export const CampMapComponent: React.FC<{
  locale: Promise<Locale>;
}> = async ({ locale: localeAsPromise }) => {
  const locale = await localeAsPromise;
  return <CampMapComponentCached locale={locale} />;
};
