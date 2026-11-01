import type {
  CampMapAnnotationPoint,
  CampMapAnnotationPolygon,
  MapQuartier,
} from '@/features/map/types/types';
import { resolveLinksInArray } from '@/features/payload-cms/payload-cms/utils/resolve-rich-text-links';
import type { Locale } from '@/types/types';
import { formatHexColor } from '@/utils/format-hex-color';
import type { Payload } from 'payload';

export interface MapAnnotations {
  campMapAnnotationPoints: CampMapAnnotationPoint[];
  campMapAnnotationPolygons: CampMapAnnotationPolygon[];
}

/** Most places the camp has, with room to spare. */
const LIMIT = 1000;

const idOf = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return typeof value.id === 'string' ? value.id : undefined;
  }
  return undefined;
};

/**
 * Everything the camp map shows: its places as markers and areas, and the Quartier an area
 * belongs to. The programme at a place is not part of it: the map reads it from the schedule
 * query, which a device keeps once for every screen and for offline use.
 */
export const loadMapAnnotations = async (
  payload: Payload,
  locale: Locale,
): Promise<MapAnnotations> => {
  // without a locale Payload answers in German, whatever language the map is shown in
  const [annotations, quartiere] = await Promise.all([
    payload.find({ collection: 'camp-map-annotations', limit: LIMIT, depth: 1, locale }),
    // read on the server for every visitor: the Quartier names are public on the map itself
    payload.find({
      collection: 'quartiere',
      limit: LIMIT,
      depth: 0,
      overrideAccess: true,
      select: { name: true, number: true, rufname: true, mapAnnotation: true },
    }),
  ]);

  await resolveLinksInArray(annotations.docs, payload, locale);

  const quartierOf = new Map(
    quartiere.docs.flatMap((quartier) => {
      const annotationId = idOf(quartier.mapAnnotation);
      if (annotationId === undefined) return [];
      const label: MapQuartier = {
        name: quartier.name,
        ...(typeof quartier.number === 'number' ? { number: quartier.number } : {}),
        ...(typeof quartier.rufname === 'string' && quartier.rufname !== ''
          ? { rufname: quartier.rufname }
          : {}),
      };
      return [[annotationId, label] as const];
    }),
  );

  const campMapAnnotationPoints: CampMapAnnotationPoint[] = annotations.docs
    .filter((document_) => document_.annotationType === 'marker')
    // order by latitude, to avoid overlapping markers
    .sort((a, b) => {
      const aLatitude = a.geometry?.[1];
      const bLatitude = b.geometry?.[1];
      if (typeof aLatitude !== 'number' || typeof bLatitude !== 'number') return 0;
      return bLatitude - aLatitude;
    })
    .map(
      (document_) =>
        ({
          id: document_.id,
          title: document_.title,
          description: document_.description,
          geometry: { coordinates: document_.geometry },
          icon: document_.icon ?? 'MapPin',
          openingHours: document_.openingHours,
          images: document_.images ?? [],
          color: formatHexColor(document_.color) ?? '#47564c',
          importance: document_.importance,
          enableSupportChat: document_.enableSupportChat ?? true,
          hiddenOnDefaultMap: document_.hiddenOnDefaultMap ?? false,
          showLabel: document_.showLabel ?? true,
          quartier: quartierOf.get(document_.id),
        }) as CampMapAnnotationPoint,
    );

  const campMapAnnotationPolygons: CampMapAnnotationPolygon[] = annotations.docs
    .filter((document_) => document_.annotationType === 'polygon')
    .map((document_) => {
      const isInteractive = (document_ as { isInteractive?: boolean }).isInteractive ?? true;
      const rawCoords = document_.polygonCoordinates as unknown as
        { longitude: number; latitude: number }[] | undefined;
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
        quartier: quartierOf.get(document_.id),
      } as CampMapAnnotationPolygon;
    });

  return { campMapAnnotationPoints, campMapAnnotationPolygons };
};
