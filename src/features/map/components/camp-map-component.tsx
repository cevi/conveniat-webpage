import { environmentVariables } from '@/config/environment-variables';
import { MapLibreRenderer } from '@/features/map/components/map-renderer-wrapper';
import type {
  CampMapAnnotationPoint,
  CampMapAnnotationPolygon,
  InitialMapPose,
} from '@/features/map/components/types';
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

  // TODO: do we need any filtering based on an R-Tree?
  const annotations: PaginatedDocs<CampMapAnnotationPayloadDocumentType> = await payload.find({
    collection: 'camp-map-annotations',
    limit: 100,
    depth: 0,
  });

  const campMapAnnotationPoints: CampMapAnnotationPoint[] = annotations.docs
    .filter((document_) => document_.annotationType === 'marker')
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
