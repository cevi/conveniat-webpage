import { AppAdvertisement } from '@/components/app-advertisement';
import { environmentVariables } from '@/config/environment-variables';
import { MapLibreRenderer } from '@/features/map/components/map-renderer-wrapper';
import type {
  CampMapAnnotationPoint,
  CampMapAnnotationPolygon,
  CampScheduleEntry,
  InitialMapPose,
} from '@/features/map/types/types';
import type { CampMapAnnotation as CampMapAnnotationPayloadDocumentType } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import config from '@payload-config';
import { cacheLife, cacheTag } from 'next/cache';
import { getPayload, type PaginatedDocs } from 'payload';
import type React from 'react';
import 'server-only';

function parseEnvironmentMapCenter(): [number, number] {
  // this may still be undefined during build
  const environmentVariable = environmentVariables.CAMP_MAP_INITIAL_MAP_CENTER as
    | string
    | undefined;
  const parts = environmentVariable?.split('/');
  if (parts?.length !== 2) {
    return [8.301_211, 46.502_822];
  }
  return [Number.parseFloat(parts[0] ?? ''), Number.parseFloat(parts[1] ?? '')];
}

const initialMapPoseObergoms: InitialMapPose = {
  initialMapCenter: parseEnvironmentMapCenter(),
  zoom: environmentVariables.CAMP_MAP_INITIAL_ZOOM,
};

export const CampMapComponent: React.FC<{
  locale: Promise<Locale>;
}> = async ({ locale: localeAsPromise }) => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'camp-map-annotations', 'camp-schedule-entry');

  const payload = await getPayload({ config });
  const locale = await localeAsPromise;

  const annotations: PaginatedDocs<CampMapAnnotationPayloadDocumentType> = await payload.find({
    collection: 'camp-map-annotations',
    limit: 100,
    depth: 1,
  });

  const scheduleEntries = await payload.find({
    collection: 'camp-schedule-entry',
    limit: 100,
    depth: 1,
  });

  const simplifiedScheduleEntries = scheduleEntries.docs as CampScheduleEntry[];

  const schedulesPerAnnotations: { [id: string]: CampScheduleEntry[] } = {};

  for (const annotation of annotations.docs) {
    const annotationID: string = annotation.id;
    schedulesPerAnnotations[annotationID] = simplifiedScheduleEntries.filter(
      (scheduleEntry: CampScheduleEntry) => scheduleEntry.location.id === annotation.id,
    );
  }

  const campMapAnnotationPoints: CampMapAnnotationPoint[] = annotations.docs
    .filter((document_) => document_.annotationType === 'marker')
    // order by latitude, to avoid overlapping markers
    .sort((a, b) => {
      if (!a.geometry || !b.geometry) return 0;
      const aGeom = a.geometry;
      const bGeom = b.geometry;
      if (aGeom[1] < bGeom[1]) return 1;
      if (aGeom[1] > bGeom[1]) return -1;
      return 0;
    })
    .map(
      (document_) =>
        ({
          id: document_.id,
          title: document_.title,
          description: document_.description,
          geometry: {
            coordinates: document_.geometry,
          },
          icon: document_.icon ?? 'MapPin',
          openingHours: document_.openingHours,
          images: document_.images ?? [],
          color: document_.color ?? '#47564c',
        }) as CampMapAnnotationPoint,
    );

  const campMapAnnotationPolygons: CampMapAnnotationPolygon[] = annotations.docs
    .filter((document_) => document_.annotationType === 'polygon')
    .map((document_) => {
      const isInteractive = (document_ as { isInteractive?: boolean }).isInteractive ?? true;
      const rawCoords = document_.polygonCoordinates as unknown as
        | { longitude: number; latitude: number }[]
        | undefined;
      return {
        id: document_.id,
        title: document_.title,
        description: isInteractive ? document_.description : undefined,
        geometry: {
          coordinates:
            rawCoords?.map(
              (coordinate) => [coordinate.longitude, coordinate.latitude] as [number, number],
            ) ?? [],
        },
        icon: document_.icon ?? 'Tent',
        openingHours: isInteractive ? document_.openingHours : undefined,
        images: isInteractive ? (document_.images ?? []) : [],
        color: document_.color ?? '#47564c',
        isInteractive,
      } as CampMapAnnotationPolygon;
    });

  return (
    <>
      <div className="fixed top-[60px] left-0 h-[calc(100dvh-60px)] w-screen pb-20">
        <MapLibreRenderer
          initialMapPose={initialMapPoseObergoms}
          ceviLogoMarkers={[]}
          campMapAnnotationPoints={campMapAnnotationPoints}
          campMapAnnotationPolygons={campMapAnnotationPolygons}
          validateStyle={environmentVariables.NODE_ENV !== 'production'}
          schedules={schedulesPerAnnotations}
        />
      </div>

      {/* advertisement for app, hidden if already in app mode */}
      <AppAdvertisement locale={locale} />
    </>
  );
};
