import { toDatabaseDate } from '@/features/visit-day/visit-day-settings';
import type { PrismaClient } from '@/lib/prisma';

/** The places taken on each day, by `YYYY-MM-DD`. A day nobody registered for is absent. */
export const countTakenPlaces = async (prisma: PrismaClient): Promise<Map<string, number>> => {
  const groups = await prisma.visitDayVisitor.groupBy({
    by: ['visitDate'],
    _count: { _all: true },
  });
  return new Map(
    groups.map((group) => [group.visitDate.toISOString().slice(0, 10), group._count._all]),
  );
};

export interface PlaceRequest {
  submissionId: string;
  hofId: string;
  /** `YYYY-MM-DD` */
  date: string;
  persons: number;
  capacity: number;
}

/**
 * Takes the places of one registration, or none of them when the day has too few left.
 *
 * The count and the new rows run under an advisory lock for that day, so registrations for the
 * same day are written one after the other and two of them cannot both take the last places.
 * Registrations for the other day do not wait.
 */
export const reservePlaces = async (
  prisma: PrismaClient,
  request: PlaceRequest,
): Promise<'reserved' | 'full'> =>
  prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`visit-day:${request.date}`}))`;
    const visitDate = toDatabaseDate(request.date);
    const taken = await transaction.visitDayVisitor.count({ where: { visitDate } });
    if (taken + request.persons > request.capacity) return 'full';
    await transaction.visitDayVisitor.createMany({
      data: Array.from({ length: request.persons }, (_, index) => ({
        submissionId: request.submissionId,
        personNumber: index + 1,
        hofId: request.hofId,
        visitDate,
      })),
    });
    return 'reserved';
  });
