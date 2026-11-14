import type { HelperShift } from '@/features/payload-cms/payload-types';
import { legacyTimeConflict, scheduleError } from '@/features/schedule/api/schedule-errors';
import { listEnrolmentHoefe, resolveEnrolmentHof } from '@/features/schedule/api/shift-hof';
import {
  assertUnenrollmentIsOpen,
  getShiftUnenrollmentDeadline,
} from '@/features/schedule/api/shift-withdrawal-guard';
import { isOrganiserOf } from '@/features/schedule/utils/organiser-check';
import { isOverlapping } from '@/features/schedule/utils/time-utils';
import { CourseType } from '@/lib/prisma/enums';
import { createTRPCRouter, publicProcedure, trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import { ensureUserExistsMiddleware } from '@/trpc/middleware/ensure-user-exists';
import config from '@payload-config';
import { TRPCError } from '@trpc/server';
import { getPayload, NotFound } from 'payload';
import { z } from 'zod';

const shiftIdSchema = z.object({
  shiftId: z.string(),
});

/**
 * `hofId` names the Hof the shift counts for, which the enrol sheet asks only a person in
 * several Höfe about; see `resolveEnrolmentHof`.
 */
const enrollInShiftSchema = shiftIdSchema.extend({
  hofId: z.string().optional(),
});

const switchIntoShiftSchema = z.object({
  fromCourseId: z.string(),
  toShiftId: z.string(),
  hofId: z.string().optional(),
});

/**
 * Loads a shift for a mutation that has to check it, or `undefined` when it is gone.
 *
 * A withdrawal from a shift that no longer exists is not something to block: the enrolment is
 * dangling and deleting it is the only sensible outcome, so a missing shift skips the guard
 * instead of leaving the user with a row they can never get rid of.
 */
const findShiftOrUndefined = async (
  payload: Awaited<ReturnType<typeof getPayload>>,
  shiftId: string,
): Promise<HelperShift | undefined> => {
  try {
    return await payload.findByID({ collection: 'helper-shifts', id: shiftId, depth: 0 });
  } catch (error) {
    if (error instanceof NotFound) return undefined;
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Failed to load helper shift ${shiftId}`,
      cause: error,
    });
  }
};

export const shiftsRouter = createTRPCRouter({
  getShifts: publicProcedure.query(async ({ ctx }) => {
    const { locale, prisma, user } = ctx;
    const { getHelperShifts } = await import('./get-helper-shifts');
    return getHelperShifts({}, locale, { prisma, user });
  }),

  getShiftStatus: publicProcedure.input(shiftIdSchema).query(async ({ input, ctx }) => {
    const { prisma, user } = ctx;
    const { shiftId } = input;

    const payload = await getPayload({ config });

    let shift;
    try {
      shift = await payload.findByID({
        collection: 'helper-shifts',
        id: shiftId,
        depth: 0,
      });
    } catch (error) {
      // A deleted shift is a real answer and stays `null`. Anything else — a database hiccup, a
      // connection pool timeout while the offline sync asks for every shift at once — is not, and
      // must surface as an error: a `null` here is a *successful* response, so the client cached
      // and persisted it and then rendered "offline" for that one shift forever.
      if (error instanceof NotFound) {
        return null;
      }
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to load helper shift ${shiftId}`,
        cause: error,
      });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { courseId: shiftId, courseType: CourseType.SHIFT },
      include: { user: true },
    });

    const isEnrolled = user
      ? enrollments.some((enrollment_) => enrollment_.userId === user.uuid)
      : false;

    // `depth: 0` leaves the relationship as plain user IDs, which is all an ownership check
    // needs - populating the organisers here would only pay for documents nobody renders.
    const isOrganiser = isOrganiserOf(shift.organiser, user?.uuid);

    /**
     * Mirrors `schedule.getCourseStatus`: the roster belongs to the organisers of the shift and
     * nobody else, and only while "Teilnehmerliste ausblenden" is off - with it on the list stays
     * exclusive to the admin panel, whose export never consults the flag.
     *
     * This is decided on the server rather than in the card, because a client-side guard would
     * still ship the helper names in the tRPC response for any enrolled user to read.
     *
     * The flag is compared against `true` rather than `false` because Payload only materialises
     * a checkbox on documents saved since it was added - shifts predating it carry `undefined`,
     * which has to read as its `false` default ("not hidden") rather than withhold the list.
     */
    const participants =
      isOrganiser && shift.hide_participant_list !== true
        ? enrollments.map((enrollment_) => ({
            uuid: enrollment_.user.uuid,
            name: enrollment_.user.name,
          }))
        : [];

    return {
      enrolledCount: enrollments.length,
      maxParticipants:
        typeof shift.participants_max === 'number' ? shift.participants_max : undefined,
      /**
       * The instant after which withdrawing is refused, as an absolute timestamp rather than a
       * "can I still leave" flag: the status is cached for five minutes and persisted across
       * restarts, so a boolean computed here would still read "yes" long after the window closed.
       */
      unenrollmentDeadline: getShiftUnenrollmentDeadline(shift)?.toISOString(),
      isEnrolled,
      isAdmin: isOrganiser,
      isOrganiser,
      enableEnrolment: shift.enable_enrolment,
      hideList: shift.hide_participant_list,
      participants,
    };
  }),

  getMyShiftEnrollments: publicProcedure.query(async ({ ctx }) => {
    const { user, prisma } = ctx;
    if (!user) return [];

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.uuid, courseType: CourseType.SHIFT },
      select: { courseId: true },
    });
    return enrollments.map((enrollment_) => enrollment_.courseId);
  }),

  /**
   * IDs of the shifts the user organises.
   *
   * Organisers have to see their own shift in "Programm von heute" without taking up one of the
   * helper slots, so - unlike workshops, where organiser-ship is materialised as a star - shift
   * organiser-ship is reported separately and merged with the enrolments on the dashboard.
   */
  /** The Höfe the user may count a shift for, which the enrol sheet offers to choose from. */
  getMyEnrolmentHoefe: publicProcedure.query(async ({ ctx }) => {
    const { user, prisma } = ctx;
    if (!user) return [];
    return listEnrolmentHoefe(prisma, user.uuid);
  }),

  getMyOrganisedShifts: publicProcedure.query(async ({ ctx }) => {
    const { user } = ctx;
    if (!user) return [];

    const { getOrganisedShiftIds } = await import('./organiser-entries');
    return getOrganisedShiftIds(user.uuid);
  }),

  enrollInShift: trpcBaseProcedure
    .input(enrollInShiftSchema)
    .use(ensureUserExistsMiddleware)
    .use(databaseTransactionWrapper)
    .mutation(async ({ input, ctx }) => {
      const { user, prisma } = ctx;
      const { shiftId } = input;

      const payload = await getPayload({ config });
      const shift = await payload.findByID({
        collection: 'helper-shifts',
        id: shiftId,
        depth: 0,
      });

      if (shift.enable_enrolment === false) {
        throw scheduleError('BAD_REQUEST', 'shiftEnrolmentClosed');
      }

      // Acquire advisory lock to prevent race conditions on capacity
      await prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${shiftId}))`;

      // Check capacity
      const currentCount = await prisma.enrollment.count({
        where: { courseId: shiftId, courseType: CourseType.SHIFT },
      });
      if (
        shift.participants_max !== null &&
        shift.participants_max !== undefined &&
        currentCount >= shift.participants_max
      ) {
        throw scheduleError('BAD_REQUEST', 'shiftFull');
      }

      // Cross-collection overlap check: check against BOTH enrolled shifts AND workshops
      const [userShiftEnrollments, userProgramEnrollments] = await Promise.all([
        prisma.enrollment.findMany({
          where: { userId: user.uuid, courseType: CourseType.SHIFT },
        }),
        prisma.enrollment.findMany({
          where: { userId: user.uuid, courseType: CourseType.PROGRAM },
        }),
      ]);

      // Check for overlap with other shifts
      if (userShiftEnrollments.length > 0) {
        const otherShifts = await payload.find({
          collection: 'helper-shifts',
          where: { id: { in: userShiftEnrollments.map((enrollment_) => enrollment_.courseId) } },
          pagination: false,
          depth: 0,
          select: { timeslot: true, title: true },
        });

        for (const other of otherShifts.docs) {
          if (
            isOverlapping(
              String(shift.timeslot.time),
              String(shift.timeslot.date),
              String(other.timeslot.time),
              String(other.timeslot.date),
            )
          ) {
            throw scheduleError(
              'CONFLICT',
              'timeConflict',
              { kind: 'shift', title: String(other.title), id: String(other.id) },
              legacyTimeConflict('shift', String(other.title), String(other.id)),
            );
          }
        }
      }

      // Check for overlap with enrolled workshops/programs
      if (userProgramEnrollments.length > 0) {
        const otherPrograms = await payload.find({
          collection: 'camp-schedule-entry',
          where: { id: { in: userProgramEnrollments.map((enrollment_) => enrollment_.courseId) } },
          pagination: false,
          depth: 0,
          select: { timeslot: true, title: true },
        });

        for (const other of otherPrograms.docs) {
          if (
            isOverlapping(
              String(shift.timeslot.time),
              String(shift.timeslot.date),
              String(other.timeslot.time),
              String(other.timeslot.date),
            )
          ) {
            throw scheduleError(
              'CONFLICT',
              'timeConflict',
              { kind: 'workshop', title: String(other.title), id: String(other.id) },
              legacyTimeConflict('workshop', String(other.title), String(other.id)),
            );
          }
        }
      }

      const hofId = await resolveEnrolmentHof(prisma, user.uuid, input.hofId);

      await prisma.enrollment.create({
        data: {
          userId: user.uuid,
          courseId: shiftId,
          courseType: CourseType.SHIFT,
          hofId,
        },
      });

      return { success: true };
    }),

  unenrollFromShift: trpcBaseProcedure
    .input(shiftIdSchema)
    .use(ensureUserExistsMiddleware)
    .use(databaseTransactionWrapper)
    .mutation(async ({ input, ctx }) => {
      const { user, prisma } = ctx;

      const payload = await getPayload({ config });
      const shift = await findShiftOrUndefined(payload, input.shiftId);
      if (shift !== undefined) {
        assertUnenrollmentIsOpen(shift);
      }

      await prisma.enrollment.deleteMany({
        where: { userId: user.uuid, courseId: input.shiftId, courseType: CourseType.SHIFT },
      });

      return { success: true };
    }),

  switchIntoShift: trpcBaseProcedure
    .input(switchIntoShiftSchema)
    .use(ensureUserExistsMiddleware)
    .use(databaseTransactionWrapper)
    .mutation(async ({ input, ctx }) => {
      const { user, prisma } = ctx;
      const { fromCourseId, toShiftId } = input;

      const payload = await getPayload({ config });
      const toShift = await payload.findByID({
        collection: 'helper-shifts',
        id: toShiftId,
        depth: 0,
      });

      if (toShift.enable_enrolment === false) {
        throw scheduleError('BAD_REQUEST', 'shiftEnrolmentClosed');
      }

      // Verify user is enrolled in the from course (can be shift or workshop)
      const existingEnrollment = await prisma.enrollment.findFirst({
        where: {
          courseId: fromCourseId,
          userId: user.uuid,
        },
      });

      if (!existingEnrollment) {
        throw scheduleError('BAD_REQUEST', 'notEnrolledInSource');
      }

      /**
       * Switching away from a shift is a withdrawal from it, so it closes at the same moment.
       * Without this the deadline would only cost a helper two taps: enrol somewhere overlapping
       * and take the switch the conflict dialog offers. Workshops have no such window, so only a
       * shift on the leaving side is checked.
       */
      if (existingEnrollment.courseType === CourseType.SHIFT) {
        const fromShift = await findShiftOrUndefined(payload, fromCourseId);
        if (fromShift !== undefined) {
          assertUnenrollmentIsOpen(fromShift);
        }
      }

      // Lock new shift constraints
      await prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${toShiftId}))`;

      const currentCount = await prisma.enrollment.count({
        where: { courseId: toShiftId, courseType: CourseType.SHIFT },
      });

      if (
        toShift.participants_max !== null &&
        toShift.participants_max !== undefined &&
        currentCount >= toShift.participants_max
      ) {
        throw scheduleError('BAD_REQUEST', 'shiftFull');
      }

      const [userShiftEnrollments, userProgramEnrollments] = await Promise.all([
        prisma.enrollment.findMany({
          where: { userId: user.uuid, courseType: CourseType.SHIFT },
        }),
        prisma.enrollment.findMany({
          where: { userId: user.uuid, courseType: CourseType.PROGRAM },
        }),
      ]);

      // Check overlap for shifts (ignoring fromCourseId)
      const activeShifts = userShiftEnrollments.filter(
        (enrollment_) => enrollment_.courseId !== fromCourseId,
      );
      if (activeShifts.length > 0) {
        const otherShifts = await payload.find({
          collection: 'helper-shifts',
          where: { id: { in: activeShifts.map((enrollment_) => enrollment_.courseId) } },
          pagination: false,
          depth: 0,
          select: { timeslot: true, title: true },
        });
        for (const other of otherShifts.docs) {
          if (
            isOverlapping(
              String(toShift.timeslot.time),
              String(toShift.timeslot.date),
              String(other.timeslot.time),
              String(other.timeslot.date),
            )
          ) {
            throw scheduleError(
              'CONFLICT',
              'timeConflict',
              { kind: 'shift', title: String(other.title), id: String(other.id) },
              legacyTimeConflict('shift', String(other.title), String(other.id)),
            );
          }
        }
      }

      // Check overlap for workshops (ignoring fromCourseId)
      const activePrograms = userProgramEnrollments.filter(
        (enrollment_) => enrollment_.courseId !== fromCourseId,
      );
      if (activePrograms.length > 0) {
        const otherPrograms = await payload.find({
          collection: 'camp-schedule-entry',
          where: { id: { in: activePrograms.map((enrollment_) => enrollment_.courseId) } },
          pagination: false,
          depth: 0,
          select: { timeslot: true, title: true },
        });
        for (const other of otherPrograms.docs) {
          if (
            isOverlapping(
              String(toShift.timeslot.time),
              String(toShift.timeslot.date),
              String(other.timeslot.time),
              String(other.timeslot.date),
            )
          ) {
            throw scheduleError(
              'CONFLICT',
              'timeConflict',
              { kind: 'workshop', title: String(other.title), id: String(other.id) },
              legacyTimeConflict('workshop', String(other.title), String(other.id)),
            );
          }
        }
      }

      const hofId = await resolveEnrolmentHof(prisma, user.uuid, input.hofId);

      // Atomic Unenroll & Enroll
      await prisma.enrollment.delete({
        where: {
          courseId_courseType_userId: {
            courseId: fromCourseId,
            courseType: existingEnrollment.courseType,
            userId: user.uuid,
          },
        },
      });

      await prisma.enrollment.create({
        data: {
          userId: user.uuid,
          courseId: toShiftId,
          courseType: CourseType.SHIFT,
          hofId,
        },
      });

      return { success: true };
    }),
});
