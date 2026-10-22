import { loadMapAnnotations } from '@/features/map/api/load-map-annotations';
import { createTRPCRouter, publicProcedure } from '@/trpc/init';
import { formatHexColor } from '@/utils/format-hex-color';
import config from '@payload-config';
import { getPayload } from 'payload';
import { z } from 'zod';

/**
 * TRPC router for map-related operations.
 *
 * Public: the camp map is for guests too, the same as the schedule it links to. A login-only
 * procedure answered a guest with a 401, which the client handles by sending them back to
 * `/entrypoint`, so opening the map, a schedule entry's mini map, or the offline download threw
 * a guest out of the app.
 */
export const mapRouter = createTRPCRouter({
  /**
   * Get all map annotations (polygons and markers).
   * Used by the mini map to show context with all annotations.
   */
  getAnnotations: publicProcedure.query(async () => {
    const payload = await getPayload({ config });

    const annotations = await payload.find({
      collection: 'camp-map-annotations',
      limit: 100,
      depth: 1,
    });

    // Transform to simplified frontend format
    const polygons = annotations.docs
      .filter(
        (document_) => document_.annotationType === 'polygon' && !document_.hiddenOnDefaultMap,
      )
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
          color: formatHexColor(document_.color) ?? '#47564c',
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

  /**
   * Get all map annotations (points and polygons) and related schedules.
   * Used for updating annotations dynamically when online.
   */
  getMapAnnotations: publicProcedure
    .input(
      z.object({
        locale: z.enum(['en', 'de', 'fr']),
      }),
    )
    .query(async ({ input }) => {
      const payload = await getPayload({ config });
      return loadMapAnnotations(payload, input.locale);
    }),
});
