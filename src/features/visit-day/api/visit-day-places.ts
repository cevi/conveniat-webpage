import { toDatabaseDate } from '@/features/visit-day/visit-day-settings';
import type { PrismaClient } from '@/lib/prisma/client';

/** The places taken on one day, by kind. */
export interface TakenPlaces {
  withLunch: number;
  withoutLunch: number;
  /** of both kinds, those of visitors without a Hof */
  external: number;
}

/** The visitors of one kind on one day, as the database counts them. */
interface TakenPlacesRow {
  /** `YYYY-MM-DD` */
  day: string;
  withLunch: boolean;
  external: boolean;
  visitors: number;
}

/**
 * The places taken on each day, by `YYYY-MM-DD`. A day nobody registered for is absent.
 *
 * The database counts: the open registration form asks for this every minute, and Prisma's
 * `groupBy` cannot group the visitors by the day of their registration, so a query of its own
 * answers with one row per day and kind instead of one per registration.
 */
export const countTakenPlaces = async (
  prisma: Pick<PrismaClient, '$queryRaw'>,
): Promise<Map<string, TakenPlaces>> => {
  const rows = await prisma.$queryRaw<TakenPlacesRow[]>`
    SELECT to_char(r."visitDate", 'YYYY-MM-DD') AS "day",
           r."withLunch" AS "withLunch",
           r."hofId" IS NULL AS "external",
           COUNT(*)::int AS "visitors"
    FROM "VisitDayVisitor" v
    JOIN "VisitDayRegistration" r ON r."id" = v."registrationId"
    GROUP BY 1, 2, 3`;
  const taken = new Map<string, TakenPlaces>();
  for (const row of rows) {
    const places = taken.get(row.day) ?? { withLunch: 0, withoutLunch: 0, external: 0 };
    if (row.withLunch) places.withLunch += row.visitors;
    else places.withoutLunch += row.visitors;
    if (row.external) places.external += row.visitors;
    taken.set(row.day, places);
  }
  return taken;
};

/** The places of one kind taken on one day. */
export const countTakenPlacesOn = async (
  prisma: Pick<PrismaClient, 'visitDayVisitor'>,
  day: string,
  withLunch: boolean,
): Promise<number> =>
  prisma.visitDayVisitor.count({
    where: { registration: { visitDate: toDatabaseDate(day), withLunch } },
  });

/** The places of visitors without a Hof taken on one day, with lunch or without. */
export const countExternalPlacesOn = async (
  prisma: Pick<PrismaClient, 'visitDayVisitor'>,
  day: string,
): Promise<number> =>
  prisma.visitDayVisitor.count({
    where: { registration: { visitDate: toDatabaseDate(day), hofId: null } },
  });

/**
 * Whether persons without a Hof still fit into the day's Kontingent for them: -1 takes none, and
 * without a Kontingent only the places of their kind limit them.
 */
export const fitsExternalCapacity = (
  externalCapacity: number | undefined,
  taken: number,
  persons: number,
): boolean =>
  externalCapacity === undefined || (externalCapacity >= 0 && taken + persons <= externalCapacity);

/** The first part of the number of a registration without a Hof. */
export const EXTERNAL_NUMBER_PREFIX = 'EXT';

/** e.g. "5321-B007": the Hof's Cevi.DB event, then its counter, three digits at least. */
export const formatRegistrationNumber = (eventId: string, counter: number): string =>
  `${eventId}-B${String(counter).padStart(3, '0')}`;

export interface PlaceRequest {
  submissionId: string;
  /** the visited Hof, or undefined for a visitor without one */
  hofId: string | undefined;
  /** the Cevi.DB event of the Hof, the first part of the registration number */
  hofEventId: string;
  /** `YYYY-MM-DD` */
  date: string;
  persons: number;
  withLunch: boolean;
  /** the places of this kind the day has */
  capacity: number;
  /** the day's Kontingent for visitors without a Hof, see `VisitDay.externalCapacity` */
  externalCapacity?: number;
}

export type PlaceResult =
  | {
      status: 'reserved';
      number: string;
      /** the row in Postgres */
      registrationId: string;
      /** the number of the registration's bill, see `visitDayBillReference` */
      billNumber: number;
    }
  | { status: 'full' }
  /** a visitor without a Hof found the day's Kontingent for them closed or too small */
  | { status: 'externalFull' };

/**
 * Takes the places of one registration and gives it the next number of its Hof, or does
 * neither when the day has too few places of its kind left, or, for a visitor without a Hof,
 * too few in its Kontingent for them.
 *
 * Everything runs under two advisory locks, the day's first and then the Hof's, always in that
 * order: two registrations for the last places of a day cannot both get in, and two of one Hof
 * cannot get the same number, even while an editor moves its Quartier to the other day.
 * Registrations without a Hof share one counter and one lock.
 */
export const reservePlaces = async (
  prisma: PrismaClient,
  request: PlaceRequest,
): Promise<PlaceResult> =>
  prisma.$transaction(async (transaction): Promise<PlaceResult> => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`visit-day:${request.date}`}))`;
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`visit-day-hof:${request.hofId ?? EXTERNAL_NUMBER_PREFIX}`}))`;
    const taken = await countTakenPlacesOn(transaction, request.date, request.withLunch);
    if (taken + request.persons > request.capacity) return { status: 'full' };
    if (request.hofId === undefined && request.externalCapacity !== undefined) {
      const takenExternal = await countExternalPlacesOn(transaction, request.date);
      if (!fitsExternalCapacity(request.externalCapacity, takenExternal, request.persons)) {
        return { status: 'externalFull' };
      }
    }

    // Prisma matches an empty Hof with null, never with undefined, which would match every row
    const hofId = request.hofId ?? null;
    const last = await transaction.visitDayRegistration.aggregate({
      where: { hofId },
      _max: { counter: true },
    });
    const counter = (last._max.counter ?? 0) + 1;
    const number = formatRegistrationNumber(request.hofEventId, counter);
    const created = await transaction.visitDayRegistration.create({
      select: { id: true, billNumber: true },
      data: {
        number,
        hofId,
        counter,
        withLunch: request.withLunch,
        submissionId: request.submissionId,
        visitDate: toDatabaseDate(request.date),
        visitors: {
          create: Array.from({ length: request.persons }, (_, index) => ({
            personNumber: index + 1,
          })),
        },
      },
    });
    return {
      status: 'reserved',
      number,
      registrationId: created.id,
      billNumber: created.billNumber,
    };
  });
