import { canManageHelperShifts } from '@/features/payload-cms/payload-cms/access-rules/roles';
import type { PayloadHandler } from 'payload';
import { z } from 'zod';

const TIME_SLOT = /^([01]\d|2[0-3]):([0-5]\d) - ([01]\d|2[0-3]):([0-5]\d)$/;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const copyRequestSchema = z.object({
  days: z.array(z.string().regex(ISO_DAY)).min(1).max(60),
  times: z.array(z.string().regex(TIME_SLOT)).min(1).max(12),
});

export type HelperShiftCopyRequest = z.infer<typeof copyRequestSchema>;

export interface HelperShiftCopyResult {
  created: number;
  skipped: number;
}

const DAY_MS = 86_400_000;

/** The calendar day a stored shift date falls on, in Zurich, as `YYYY-MM-DD`. */
const zurichDay = (value: string): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich' }).format(new Date(value));

/**
 * The stored date of a copy on another day: the source's instant moved by whole days, so the
 * copy keeps whatever time of day the date picker stored and lands on the same Zurich day.
 */
const moveToDay = (sourceDate: string, day: string): string => {
  const days = Math.round((Date.parse(day) - Date.parse(zurichDay(sourceDate))) / DAY_MS);
  return new Date(Date.parse(sourceDate) + days * DAY_MS).toISOString();
};

/**
 * Copies one shift onto further days and time slots: `POST /api/helper-shifts/:id/copy`.
 *
 * Every copy is an ordinary shift of its own, made with Payload's duplicate, so all locales,
 * the Schichtleitung, the size and the settings come along and the enrolments do not. A slot
 * that already has a shift of the same title on that day is skipped, so running the copy twice
 * does not double the plan.
 */
export const helperShiftCopyHandler: PayloadHandler = async (request) => {
  if (!canManageHelperShifts({ req: request })) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = (request.routeParams as { id?: string } | undefined)?.id;
  if (id === undefined || id === '') {
    return Response.json({ error: 'Missing shift id' }, { status: 400 });
  }

  const parsed = copyRequestSchema.safeParse(request.json ? await request.json() : undefined);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid days or time slots' }, { status: 400 });
  }

  const source = await request.payload.findByID({
    collection: 'helper-shifts',
    id,
    depth: 0,
    locale: 'de',
    req: request,
    overrideAccess: false,
  });

  // the shifts that already carry this title, to skip a slot that is taken
  const existing = await request.payload.find({
    collection: 'helper-shifts',
    where: { title: { equals: source.title } },
    locale: 'de',
    depth: 0,
    pagination: false,
    select: { timeslot: true },
    req: request,
    overrideAccess: false,
  });
  const taken = new Set(
    existing.docs.map((shift) => `${zurichDay(shift.timeslot.date)} ${shift.timeslot.time}`),
  );

  let created = 0;
  let skipped = 0;
  for (const day of new Set(parsed.data.days)) {
    for (const time of new Set(parsed.data.times)) {
      if (taken.has(`${day} ${time}`)) {
        skipped += 1;
        continue;
      }
      await request.payload.duplicate({
        collection: 'helper-shifts',
        id,
        data: { timeslot: { date: moveToDay(source.timeslot.date, day), time } },
        req: request,
        overrideAccess: false,
      });
      created += 1;
    }
  }

  request.payload.logger.info({ msg: 'Copied helper shift', shiftId: id, created, skipped });
  return Response.json({ created, skipped } satisfies HelperShiftCopyResult);
};
