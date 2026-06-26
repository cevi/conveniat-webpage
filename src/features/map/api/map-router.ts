import type {
  CampMapAnnotationPoint,
  CampMapAnnotationPolygon,
  CampScheduleEntry,
} from '@/features/map/types/types';
import { resolveLinksInArray } from '@/features/payload-cms/payload-cms/utils/resolve-rich-text-links';
import { createTRPCRouter, trpcBaseProcedure } from '@/trpc/init';
import { formatHexColor } from '@/utils/format-hex-color';
import config from '@payload-config';
import { getPayload } from 'payload';
import { z } from 'zod';

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
  getMapAnnotations: trpcBaseProcedure
    .input(
      z.object({
        locale: z.enum(['en', 'de', 'fr']),
      }),
    )
    .query(async ({ input }) => {
      const { locale } = input;
      const payload = await getPayload({ config });

      const annotations = await payload.find({
        collection: 'camp-map-annotations',
        limit: 100,
        depth: 1,
      });

      const scheduleEntries = await payload.find({
        collection: 'camp-schedule-entry',
        limit: 100,
        depth: 1,
      });

      // Resolve links in annotations and schedule entries
      await resolveLinksInArray(annotations.docs, payload, locale);
      await resolveLinksInArray(scheduleEntries.docs, payload, locale);

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
              color: formatHexColor(document_.color) ?? '#47564c',
              importance: document_.importance,
              enableSupportChat: document_.enableSupportChat ?? true,
              hiddenOnDefaultMap: document_.hiddenOnDefaultMap ?? false,
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
            color: formatHexColor(document_.color) ?? '#47564c',
            isInteractive,
            importance: document_.importance,
            enableSupportChat: isInteractive ? (document_.enableSupportChat ?? true) : false,
            hiddenOnDefaultMap: document_.hiddenOnDefaultMap ?? false,
          } as CampMapAnnotationPolygon;
        });

      return {
        campMapAnnotationPoints,
        campMapAnnotationPolygons,
        schedules: schedulesPerAnnotations,
      };
    }),
});
