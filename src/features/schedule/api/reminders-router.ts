import {
  DEFAULT_REMINDER_TIMING,
  REMINDER_LEAD_OPTIONS,
  reminderTimingOf,
} from '@/features/schedule/utils/reminder-timing';
import { CourseType } from '@/lib/prisma';
import { createTRPCRouter, trpcBaseProcedure } from '@/trpc/init';
import { ensureUserExistsMiddleware } from '@/trpc/middleware/ensure-user-exists';
import config from '@payload-config';
import { getPayload } from 'payload';
import { z } from 'zod';

/** What the client calls the two kinds of entry, and what Postgres calls them. */
const entryKindSchema = z.enum(['program', 'shift']);
type EntryKind = z.infer<typeof entryKindSchema>;
const COURSE_TYPE_OF: Record<EntryKind, CourseType> = {
  program: CourseType.PROGRAM,
  shift: CourseType.SHIFT,
};
const ENTRY_KIND_OF: Record<CourseType, EntryKind> = {
  [CourseType.PROGRAM]: 'program',
  [CourseType.SHIFT]: 'shift',
};

/** the id of a slot or a shift in MongoDB */
const entryIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[\w-]+$/);

const leadMinutesSchema = z
  .number()
  .int()
  .refine((minutes) => (REMINDER_LEAD_OPTIONS as readonly number[]).includes(minutes));

/** Whether one entry reminds the user, and whether it does so because they are enrolled. */
export interface ReminderState {
  entryId: string;
  entryKind: EntryKind;
  /** a push comes before it and at its start, as the settings say */
  isOn: boolean;
  /** enrolled: it reminds without being asked, until switched off */
  isAutomatic: boolean;
}

export interface ReminderSettings {
  /** minutes before the start; 0 is none */
  leadMinutes: number;
  atStart: boolean;
  /** whether any device of the user receives pushes; without one, no reminder arrives */
  hasPushDevice: boolean;
}

/**
 * "Erinnern": the reminders of blocks and shifts, and when they go out. Every procedure acts on
 * the calling user's own reminders and settings only; nobody can see or change another's.
 */
export const remindersRouter = createTRPCRouter({
  /** Every entry that reminds the user or was switched off: the ones set, and the enrolments. */
  getReminders: trpcBaseProcedure.query(async ({ ctx }): Promise<ReminderState[]> => {
    const { prisma, user } = ctx;
    const [reminders, enrollments] = await Promise.all([
      prisma.scheduleReminder.findMany({
        where: { userId: user.uuid },
        select: { entryId: true, entryType: true, enabled: true },
      }),
      prisma.enrollment.findMany({
        where: { userId: user.uuid },
        select: { courseId: true, courseType: true },
      }),
    ]);

    const states = new Map<string, ReminderState>();
    for (const { courseId, courseType } of enrollments) {
      states.set(courseId, {
        entryId: courseId,
        entryKind: ENTRY_KIND_OF[courseType],
        isOn: true,
        isAutomatic: true,
      });
    }
    for (const { entryId, entryType, enabled } of reminders) {
      states.set(entryId, {
        entryId,
        entryKind: ENTRY_KIND_OF[entryType],
        isOn: enabled,
        isAutomatic: states.get(entryId)?.isAutomatic ?? false,
      });
    }
    return [...states.values()];
  }),

  /**
   * Switches the reminder of one entry on or off. Switching it on also stars a programme block,
   * so what reminds the user is in their Favoriten too.
   */
  setReminder: trpcBaseProcedure
    .input(z.object({ entryId: entryIdSchema, entryKind: entryKindSchema, enabled: z.boolean() }))
    .use(ensureUserExistsMiddleware)
    .mutation(async ({ ctx, input }): Promise<ReminderState> => {
      const { prisma, user, locale } = ctx;
      const courseType = COURSE_TYPE_OF[input.entryKind];

      await prisma.$transaction(async (transaction) => {
        await transaction.scheduleReminder.upsert({
          where: { userId_entryId: { userId: user.uuid, entryId: input.entryId } },
          create: {
            userId: user.uuid,
            entryId: input.entryId,
            entryType: courseType,
            enabled: input.enabled,
          },
          update: { enabled: input.enabled, entryType: courseType },
        });
        if (input.enabled && courseType === CourseType.PROGRAM) {
          await transaction.star.createMany({
            data: [{ userId: user.uuid, courseId: input.entryId, courseType }],
            skipDuplicates: true,
          });
        }
        // the pushes are written in the language the user last chose a reminder in
        await transaction.user.update({
          where: { uuid: user.uuid },
          data: { reminderLocale: locale },
        });
      });

      const enrollment = await prisma.enrollment.findFirst({
        where: { userId: user.uuid, courseId: input.entryId, courseType },
        select: { id: true },
      });
      return {
        entryId: input.entryId,
        entryKind: input.entryKind,
        isOn: input.enabled,
        isAutomatic: enrollment !== null,
      };
    }),

  getReminderSettings: trpcBaseProcedure.query(async ({ ctx }): Promise<ReminderSettings> => {
    const { prisma, user } = ctx;
    const [stored, pushDevices] = await Promise.all([
      prisma.user.findUnique({
        where: { uuid: user.uuid },
        select: { reminderLeadMinutes: true, reminderAtStart: true },
      }),
      getPayload({ config }).then((payload) =>
        payload.count({
          collection: 'push-notification-subscriptions',
          where: { user: { equals: user.uuid } },
        }),
      ),
    ]);
    return {
      ...(stored === null ? DEFAULT_REMINDER_TIMING : reminderTimingOf(stored)),
      hasPushDevice: pushDevices.totalDocs > 0,
    };
  }),

  /** "Vorher" and "Beim Start" in Einstellungen; they apply to every reminder of the user. */
  updateReminderSettings: trpcBaseProcedure
    .input(z.object({ leadMinutes: leadMinutesSchema, atStart: z.boolean() }))
    .use(ensureUserExistsMiddleware)
    .mutation(async ({ ctx, input }): Promise<Omit<ReminderSettings, 'hasPushDevice'>> => {
      const { prisma, user, locale } = ctx;
      const updated = await prisma.user.update({
        where: { uuid: user.uuid },
        data: {
          reminderLeadMinutes: input.leadMinutes,
          reminderAtStart: input.atStart,
          reminderLocale: locale,
        },
        select: { reminderLeadMinutes: true, reminderAtStart: true },
      });
      return reminderTimingOf(updated);
    }),
});
