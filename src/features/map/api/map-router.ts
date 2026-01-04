import { createTRPCRouter, trpcBaseProcedure } from '@/trpc/init';
import config from '@payload-config';
import { getPayload } from 'payload';

/**
 * TRPC router for map-related operations.
 */
export const mapRouter = createTRPCRouter({
  /**
   * Get all map annotations (polygons and markers).
   * Used by the mini map to show context with all annotations.
   */
  getAnnotations: trpcBaseProcedure.query(async () => {
    const payload = await getPayload({ config });

    const annotations = await payload.find({
      collection: 'camp-map-annotations',
      limit: 100,
      depth: 1,
    });

    // Transform to simplified frontend format
    // Transform to simplified frontend format
    const polygons = annotations.docs
      .filter((document_) => document_.annotationType === 'polygon')
      .map((document_) => {
        interface CoordinateObject {
          longitude?: number;
          latitude?: number;
          lng?: number;
          lat?: number;
        }

        const rawCoords = document_.polygonCoordinates as unknown as CoordinateObject[] | undefined;

        return {
          id: document_.id,
          title: document_.title,
          color: document_.color ?? '#47564c',
          coordinates:
            rawCoords
              ?.map((coord) => {
                const lng = coord.longitude ?? coord.lng;
                const lat = coord.latitude ?? coord.lat;
                return typeof lng === 'number' && typeof lat === 'number'
                  ? ([lng, lat] as [number, number])
                  : undefined;
              })
              .filter((c): c is [number, number] => c !== undefined) ?? [],
        };
      });

    return { polygons };
  }),
});
