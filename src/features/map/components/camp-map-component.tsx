import { environmentVariables } from '@/config/environment-variables';
import { MapLibreRenderer } from '@/features/map/components/map-renderer-wrapper';
import type {
  CampMapAnnotationPoint,
  CampMapAnnotationPolygon,
  InitialMapPose,
} from '@/features/map/types/types';
import type { CampMapAnnotation as CampMapAnnotationPayloadDocumentType } from '@/features/payload-cms/payload-types';
import config from '@payload-config';
import { getPayload, type PaginatedDocs } from 'payload';
import type React from 'react';
import 'server-only';

const initialMapPoseObergoms: InitialMapPose = {
  initialMapCenter: [8.301_211, 46.502_822],
  zoom: 15.5,
};

export const CampMapComponent: React.FC = async () => {
  // load annotations from payload-cms
  const payload = await getPayload({ config });

  const annotations: PaginatedDocs<CampMapAnnotationPayloadDocumentType> = await payload.find({
    collection: 'camp-map-annotations',
    limit: 100,
    depth: 1,
  });

  const campMapAnnotationPoints: CampMapAnnotationPoint[] = annotations.docs
    .filter((document_) => document_.annotationType === 'marker')
    // order by latitude, to avoid overlapping markers
    .sort((a, b) => {
      if (!a.geometry?.coordinates || !b.geometry?.coordinates) return 0;
      if (a.geometry.coordinates[1] < b.geometry.coordinates[1]) return 1;
      if (a.geometry.coordinates[1] > b.geometry.coordinates[1]) return -1;
      return 0;
    })
    .map(
      (document_) =>
        ({
          id: document_.id,
          title: document_.title,
          description: document_.description,
          geometry: {
            coordinates: document_.geometry?.coordinates,
          },
          icon: document_.icon ?? 'MapPin',
          openingHours: document_.openingHours,
          images: document_.images ?? [],
          color: document_.color ?? '#47564c',
        }) as CampMapAnnotationPoint,
    );

  const campMapAnnotationPolygons: CampMapAnnotationPolygon[] = annotations.docs
    .filter((document_) => document_.annotationType === 'polygon')
    .map(
      (document_) =>
        ({
          id: document_.id,
          title: document_.title,
          description: document_.description,
          geometry: {
            coordinates: document_.polygonCoordinates?.map(
              (coordinate) => [coordinate.longitude, coordinate.latitude] as [number, number],
            ),
          },
          icon: document_.icon ?? 'Tent',
          openingHours: document_.openingHours,
          images: document_.images ?? [],
          color: document_.color ?? '#47564c',
        }) as CampMapAnnotationPolygon,
    );

  return (
    <div className="fixed top-[60px] left-0 h-[calc(100dvh-60px)] w-screen pb-20">
      <MapLibreRenderer
        initialMapPose={initialMapPoseObergoms}
        ceviLogoMarkers={[]}
        campMapAnnotationPoints={campMapAnnotationPoints}
        campMapAnnotationPolygons={campMapAnnotationPolygons}
        validateStyle={environmentVariables.NODE_ENV !== 'production'}
      />
    </div>
  );
};
