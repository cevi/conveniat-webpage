import { isOverlapping } from '@/features/schedule/utils/time-utils';
import { CourseType } from '@/lib/prisma';
import { createTRPCRouter, publicProcedure, trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import { ensureUserExistsMiddleware } from '@/trpc/middleware/ensure-user-exists';
import config from '@payload-config';
import { TRPCError } from '@trpc/server';
import { getPayload } from 'payload';
import { z } from 'zod';

const enrollInShiftSchema = z.object({
  shiftId: z.string(),
});

const switchIntoShiftSchema = z.object({
  fromCourseId: z.string(),
  toShiftId: z.string(),
});

export const shiftsRouter = createTRPCRouter({
  getShifts: publicProcedure.query(async ({ ctx }) => {
    const { locale } = ctx;
    const { getHelperShifts } = await import('./get-helper-shifts');
    return getHelperShifts({}, locale);
  }),

  getShiftStatus: publicProcedure.input(enrollInShiftSchema).query(async ({ input, ctx }) => {
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
    } catch {
      // eslint-disable-next-line unicorn/no-null
      return null;
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { courseId: shiftId, courseType: CourseType.SHIFT },
      include: { user: true },
    });

    const isEnrolled = user
      ? enrollments.some((enrollment_) => enrollment_.userId === user.uuid)
      : false;

    const participants =
      shift.hide_participant_list === false
        ? enrollments.map((enrollment_) => ({
            uuid: enrollment_.user.uuid,
            name: enrollment_.user.name,
          }))
        : [];

    return {
      enrolledCount: enrollments.length,
      maxParticipants:
        typeof shift.participants_max === 'number' ? shift.participants_max : undefined,
      isEnrolled,
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
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Enrolment is not enabled for this shift.',
        });
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
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This shift is already full.' });
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
            throw new TRPCError({
              code: 'CONFLICT',
              message: `Time conflict with shift: ${String(other.title)}|${String(other.id)}`,
            });
          }
        }
      }

      // Check for overlap with enrolled workshops/programs
      if (userProgramEnrollments.length > 0) {
        const otherPrograms = await payload.find({
          collection: 'camp-schedule-entry',
          where: { id: { in: userProgramEnrollments.map((enrollment_) => enrollment_.courseId) } },
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
            throw new TRPCError({
              code: 'CONFLICT',
              message: `Time conflict with workshop: ${String(other.title)}|${String(other.id)}`,
            });
          }
        }
      }

      await prisma.enrollment.create({
        data: {
          userId: user.uuid,
          courseId: shiftId,
          courseType: CourseType.SHIFT,
        },
      });

      return { success: true };
    }),

  unenrollFromShift: trpcBaseProcedure
    .input(enrollInShiftSchema)
    .use(ensureUserExistsMiddleware)
    .use(databaseTransactionWrapper)
    .mutation(async ({ input, ctx }) => {
      const { user, prisma } = ctx;

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
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Enrolment is not enabled for this shift.',
        });
      }

      // Verify user is enrolled in the from course (can be shift or workshop)
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: {
          courseId_userId: {
            courseId: fromCourseId,
            userId: user.uuid,
          },
        },
      });

      if (!existingEnrollment) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Not currently enrolled in the course you are trying to switch from.',
        });
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
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This shift is already full.' });
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
            throw new TRPCError({
              code: 'CONFLICT',
              message: `Time conflict with shift: ${String(other.title)}|${String(other.id)}`,
            });
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
            throw new TRPCError({
              code: 'CONFLICT',
              message: `Time conflict with workshop: ${String(other.title)}|${String(other.id)}`,
            });
          }
        }
      }

      // Atomic Unenroll & Enroll
      await prisma.enrollment.delete({
        where: {
          courseId_userId: {
            courseId: fromCourseId,
            userId: user.uuid,
          },
        },
      });

      await prisma.enrollment.create({
        data: {
          userId: user.uuid,
          courseId: toShiftId,
          courseType: CourseType.SHIFT,
        },
      });

      return { success: true };
    }),
});
