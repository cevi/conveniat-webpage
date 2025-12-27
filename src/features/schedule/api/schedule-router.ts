import { createNewChat } from '@/features/chat/api/database-interactions/create-new-chat'; // eslint-disable-line import/no-restricted-paths
import type { User as PayloadUser } from '@/features/payload-cms/payload-types';
import { createTRPCRouter, trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import { ensureUserExistsMiddleware } from '@/trpc/middleware/ensure-user-exists';
import config from '@payload-config';
import { TRPCError } from '@trpc/server';
import { getPayload } from 'payload';
import { z } from 'zod';

const enrollInCourseSchema = z.object({
  courseId: z.string(),
});

const isOverlapping = (time1: string, date1: string, time2: string, date2: string): boolean => {
  if (date1 !== date2) return false;
  const [start1, end1] = time1.split(' - ').map((t) => t.trim());
  const [start2, end2] = time2.split(' - ').map((t) => t.trim());
  if (!start1 || !end1 || !start2 || !end2) return false;
  return start1 < end2 && start2 < end1;
};

export const scheduleRouter = createTRPCRouter({
  getScheduleEntries: trpcBaseProcedure.query(async ({ ctx }) => {
    const { locale } = ctx;
    const { getScheduleEntries } = await import('./get-schedule-entries');
    return getScheduleEntries({}, locale);
  }),

  getById: trpcBaseProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const { locale } = ctx;
    const { getById } = await import('./get-by-id');
    return getById(input.id, locale);
  }),

  getCourseStatus: trpcBaseProcedure.input(enrollInCourseSchema).query(async ({ input, ctx }) => {
    const { prisma, user } = ctx;
    const { courseId } = input;

    const payload = await getPayload({ config });
    const course = await payload.findByID({
      collection: 'camp-schedule-entry',
      id: courseId,
      depth: 1,
    });

    const enrollments = await prisma.enrollment.findMany({
      where: { courseId },
      include: { user: true },
    });

    const isEnrolled = enrollments.some((enrollment_) => enrollment_.userId === user.uuid);
    const organisers = course.organiser as PayloadUser[];
    const isAdmin = organisers.some((o) => o.id === user.uuid);

    return {
      enrolledCount: enrollments.length,
      maxParticipants: course.participants_max,
      isEnrolled,
      isAdmin,
      enableEnrolment: course.enable_enrolment,
      hideList: course.hide_participant_list,
      participants:
        isAdmin || !course.hide_participant_list
          ? enrollments.map((enrollment_) => ({
              uuid: enrollment_.user.uuid,
              name: enrollment_.user.name,
            }))
          : [],
    };
  }),

  getMyEnrollments: trpcBaseProcedure.query(async ({ ctx }) => {
    const { user, prisma } = ctx;
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.uuid },
      select: { courseId: true },
    });
    return enrollments.map((enrollment_) => enrollment_.courseId);
  }),

  enrollInCourse: trpcBaseProcedure
    .input(enrollInCourseSchema)
    .use(ensureUserExistsMiddleware)
    .use(databaseTransactionWrapper)
    .mutation(async ({ input, ctx }) => {
      const { user, prisma } = ctx;
      const { courseId } = input;

      const payload = await getPayload({ config });
      const course = await payload.findByID({
        collection: 'camp-schedule-entry',
        id: courseId,
      });

      if (course.enable_enrolment === false) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Enrolment is not enabled for this course.',
        });
      }

      // Check capacity
      const currentCount = await prisma.enrollment.count({ where: { courseId } });
      if (course.participants_max && currentCount >= course.participants_max) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Course is already full.' });
      }

      // Check conflicts
      const userEnrollments = await prisma.enrollment.findMany({
        where: { userId: user.uuid },
      });

      if (userEnrollments.length > 0) {
        const otherCourses = await payload.find({
          collection: 'camp-schedule-entry',
          where: {
            id: { in: userEnrollments.map((enrollment_) => enrollment_.courseId) },
          },
        });

        for (const other of otherCourses.docs) {
          if (
            isOverlapping(
              course.timeslot.time,
              course.timeslot.date,
              other.timeslot.time,
              other.timeslot.date,
            )
          ) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              // Format: "Time conflict with [TITLE]|[ID]" - the ID is used for switch enrollment
              message: `Time conflict with ${other.title}|${other.id}`,
            });
          }
        }
      }

      await prisma.enrollment.create({
        data: { userId: user.uuid, courseId },
      });

      return { success: true };
    }),

  /**
   * Switch enrollment from one course to another in a single transaction.
   * This unenrolls from the old course and enrolls in the new course atomically.
   */
  switchEnrollment: trpcBaseProcedure
    .input(
      z.object({
        fromCourseId: z.string(),
        toCourseId: z.string(),
      }),
    )
    .use(ensureUserExistsMiddleware)
    .use(databaseTransactionWrapper)
    .mutation(async ({ input, ctx }) => {
      const { user, prisma } = ctx;
      const { fromCourseId, toCourseId } = input;

      const payload = await getPayload({ config });

      // Fetch both courses
      const [fromCourse, toCourse] = await Promise.all([
        payload.findByID({
          collection: 'camp-schedule-entry',
          id: fromCourseId,
        }),
        payload.findByID({
          collection: 'camp-schedule-entry',
          id: toCourseId,
        }),
      ]);

      // Verify user is enrolled in the from course
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
          message: 'You are not enrolled in the course you are trying to switch from.',
        });
      }

      // Verify enrollment is enabled for the target course
      if (!toCourse.enable_enrolment) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Enrollment is not enabled for the target course.',
        });
      }

      // Check capacity of target course
      const currentCount = await prisma.enrollment.count({ where: { courseId: toCourseId } });
      if (toCourse.participants_max && currentCount >= toCourse.participants_max) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Target course is already full.',
        });
      }

      // Note: We don't verify overlap here - the client is calling this endpoint
      // because it received a time conflict error, so we trust the switch is intentional.

      // Check for other conflicts (excluding the course we're switching from)
      const userEnrollments = await prisma.enrollment.findMany({
        where: {
          userId: user.uuid,
          NOT: { courseId: fromCourseId },
        },
      });

      if (userEnrollments.length > 0) {
        const otherCourses = await payload.find({
          collection: 'camp-schedule-entry',
          where: {
            id: { in: userEnrollments.map((event_) => event_.courseId) },
          },
        });

        for (const other of otherCourses.docs) {
          if (
            isOverlapping(
              toCourse.timeslot.time,
              toCourse.timeslot.date,
              other.timeslot.time,
              other.timeslot.date,
            )
          ) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Time conflict with ${other.title}`,
            });
          }
        }
      }

      // Perform the switch atomically
      await prisma.enrollment.delete({
        where: {
          courseId_userId: {
            courseId: fromCourseId,
            userId: user.uuid,
          },
        },
      });

      await prisma.enrollment.create({
        data: { userId: user.uuid, courseId: toCourseId },
      });

      return {
        success: true,
        switchedFrom: fromCourse.title,
        switchedTo: toCourse.title,
      };
    }),

  unenrollFromCourse: trpcBaseProcedure
    .input(enrollInCourseSchema)
    .use(ensureUserExistsMiddleware)
    .use(databaseTransactionWrapper)
    .mutation(async ({ input, ctx }) => {
      const { user, prisma } = ctx;
      const { courseId } = input;

      await prisma.enrollment.deleteMany({
        where: { userId: user.uuid, courseId },
      });

      return { success: true };
    }),

  updateCourseDetails: trpcBaseProcedure
    .input(
      z.object({
        courseId: z.string(),
        description: z.any().optional(),
        targetGroup: z.any().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { user } = ctx;
      const payload = await getPayload({ config });

      const course = await payload.findByID({
        collection: 'camp-schedule-entry',
        id: input.courseId,
        depth: 0,
      });

      const organisers = course.organiser as string[];
      if (!organisers.includes(user.uuid)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only organisers can update details.' });
      }

      const updateData: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
      if (input.description) updateData.description = input.description; // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      if (input.targetGroup) updateData.target_group = input.targetGroup; // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access

      await payload.update({
        collection: 'camp-schedule-entry',
        id: input.courseId,
        data: updateData, // eslint-disable-line @typescript-eslint/no-unsafe-assignment
      });

      return { success: true };
    }),

  createWorkshopChat: trpcBaseProcedure
    .input(z.object({ courseId: z.string(), chatName: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { user, prisma, locale } = ctx;
      const payload = await getPayload({ config });

      const course = await payload.findByID({
        collection: 'camp-schedule-entry',
        id: input.courseId,
      });

      const organisers = course.organiser as string[];
      if (!organisers.includes(user.uuid)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only organisers can create the group chat.',
        });
      }

      const enrollments = await prisma.enrollment.findMany({
        where: { courseId: input.courseId },
        select: { userId: true },
      });

      const members = enrollments
        .filter((enrollment_) => enrollment_.userId !== user.uuid)
        .map((enrollment_) => ({ userId: enrollment_.userId }));

      if (members.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot create chat with no other participants.',
        });
      }

      const chat = await createNewChat(input.chatName, locale, user, members, prisma);
      return { chatId: chat.uuid };
    }),

  star: createTRPCRouter({
    toggleStar: trpcBaseProcedure
      .input(z.object({ courseId: z.string() }))
      .use(ensureUserExistsMiddleware)
      .mutation(async ({ input, ctx }) => {
        const { user, prisma } = ctx;
        const { courseId } = input;

        const existingStar = await prisma.star.findUnique({
          where: {
            courseId_userId: {
              courseId,
              userId: user.uuid,
            },
          },
        });

        if (existingStar) {
          await prisma.star.delete({
            where: {
              id: existingStar.id,
            },
          });
          return { starred: false };
        } else {
          await prisma.star.create({
            data: {
              courseId,
              userId: user.uuid,
            },
          });
          return { starred: true };
        }
      }),

    getMyStars: trpcBaseProcedure.query(async ({ ctx }) => {
      const { user, prisma } = ctx;
      const stars = await prisma.star.findMany({
        where: {
          userId: user.uuid,
        },
        select: {
          courseId: true,
        },
      });
      return stars.map((s: { courseId: string }) => s.courseId);
    }),

    syncStars: trpcBaseProcedure
      .input(z.object({ courseIds: z.array(z.string()) }))
      .use(ensureUserExistsMiddleware)
      .mutation(async ({ input, ctx }) => {
        const { user, prisma } = ctx;
        const { courseIds } = input;

        for (const courseId of courseIds) {
          await prisma.star.upsert({
            where: {
              courseId_userId: {
                courseId,
                userId: user.uuid,
              },
            },
            create: {
              courseId,
              userId: user.uuid,
            },
            update: {},
          });
        }

        const allStars = await prisma.star.findMany({
          where: { userId: user.uuid },
          select: { courseId: true },
        });
        return allStars.map((s: { courseId: string }) => s.courseId);
      }),

    getStarCount: trpcBaseProcedure
      .input(z.object({ courseId: z.string() }))
      .query(async ({ input, ctx }) => {
        const { prisma } = ctx;

        return await prisma.star.count({
          where: { courseId: input.courseId },
        });
      }),
  }),
});
