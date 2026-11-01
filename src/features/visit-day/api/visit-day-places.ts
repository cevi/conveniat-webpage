import { toDatabaseDate } from '@/features/visit-day/visit-day-settings';
import type { PrismaClient } from '@/lib/prisma';

/** The places taken on each day, by `YYYY-MM-DD`. A day nobody registered for is absent. */
export const countTakenPlaces = async (prisma: PrismaClient): Promise<Map<string, number>> => {
  const registrations = await prisma.visitDayRegistration.findMany({
    select: { visitDate: true, _count: { select: { visitors: true } } },
  });
  const taken = new Map<string, number>();
  for (const registration of registrations) {
    const day = registration.visitDate.toISOString().slice(0, 10);
    taken.set(day, (taken.get(day) ?? 0) + registration._count.visitors);
  }
  return taken;
};

/** The places taken on one day. */
export const countTakenPlacesOn = async (
  prisma: Pick<PrismaClient, 'visitDayVisitor'>,
  day: string,
): Promise<number> =>
  prisma.visitDayVisitor.count({ where: { registration: { visitDate: toDatabaseDate(day) } } });

/** e.g. "5321-B007": the Hof's Cevi.DB event, then its counter, three digits at least. */
export const formatRegistrationNumber = (eventId: string, counter: number): string =>
  `${eventId}-B${String(counter).padStart(3, '0')}`;

export interface PlaceRequest {
  submissionId: string;
  hofId: string;
  /** the Cevi.DB event of the Hof, the first part of the registration number */
  hofEventId: string;
  /** `YYYY-MM-DD` */
  date: string;
  persons: number;
  capacity: number;
}

export type PlaceResult = { status: 'reserved'; number: string } | { status: 'full' };

/**
 * Takes the places of one registration and gives it the next number of its Hof, or does
 * neither when the day has too few places left.
 *
 * Everything runs under two advisory locks, the day's first and then the Hof's, always in that
 * order: two registrations for the last places of a day cannot both get in, and two of one Hof
 * cannot get the same number, even while an editor moves its Quartier to the other day.
 */
export const reservePlaces = async (
  prisma: PrismaClient,
  request: PlaceRequest,
): Promise<PlaceResult> =>
  prisma.$transaction(async (transaction): Promise<PlaceResult> => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`visit-day:${request.date}`}))`;
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`visit-day-hof:${request.hofId}`}))`;
    const taken = await countTakenPlacesOn(transaction, request.date);
    if (taken + request.persons > request.capacity) return { status: 'full' };

    const last = await transaction.visitDayRegistration.aggregate({
      where: { hofId: request.hofId },
      _max: { counter: true },
    });
    const counter = (last._max.counter ?? 0) + 1;
    const number = formatRegistrationNumber(request.hofEventId, counter);
    await transaction.visitDayRegistration.create({
      data: {
        number,
        hofId: request.hofId,
        counter,
        submissionId: request.submissionId,
        visitDate: toDatabaseDate(request.date),
        visitors: {
          create: Array.from({ length: request.persons }, (_, index) => ({
            personNumber: index + 1,
          })),
        },
      },
    });
    return { status: 'reserved', number };
  });
