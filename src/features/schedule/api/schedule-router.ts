import { createNewChat } from '@/features/chat/api/database-interactions/create-new-chat'; // eslint-disable-line import/no-restricted-paths
import type { User as PayloadUser } from '@/features/payload-cms/payload-types';
import { isOverlapping } from '@/features/schedule/utils/time-utils';
import {
  ChatMembershipPermission,
  ChatType,
  CourseType,
  MessageEventType,
  MessageType,
} from '@/lib/prisma';
import { createTRPCRouter, publicProcedure, trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import { ensureUserExistsMiddleware } from '@/trpc/middleware/ensure-user-exists';
import { convertLexicalToMarkdown, convertMarkdownToLexical } from '@/utils/markdown-to-lexical';
import config from '@payload-config';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { TRPCError } from '@trpc/server';
import { getPayload } from 'payload';
import { z } from 'zod';

const enrollInCourseSchema = z.object({
  courseId: z.string(),
});

export const scheduleRouter = createTRPCRouter({
  getScheduleEntries: publicProcedure.query(async ({ ctx }) => {
    const { locale } = ctx;
    const { getScheduleEntries } = await import('./get-schedule-entries');
    return getScheduleEntries({}, locale);
  }),

  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const { locale } = ctx;
    const { getById } = await import('./get-by-id');
    return getById(input.id, locale);
  }),

  getCourseStatus: publicProcedure.input(enrollInCourseSchema).query(async ({ input, ctx }) => {
    const { prisma, user } = ctx;
    const { courseId } = input;

    const payload = await getPayload({ config });

    // Try to find the course, return null if not found
    let course;
    try {
      course = await payload.findByID({
        collection: 'camp-schedule-entry',
        id: courseId,
        depth: 1,
      });
    } catch {
      // Course not found - return null instead of throwing
      // eslint-disable-next-line unicorn/no-null
      return null;
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { courseId },
      include: { user: true },
    });

    const isEnrolled = user
      ? enrollments.some((enrollment_) => enrollment_.userId === user.uuid)
      : false;
    const organisers = (course.organiser ?? []) as PayloadUser[];
    const isAdmin = user ? organisers.some((o) => o.id === user.uuid) : false;

    // Check if a group chat exists for this course
    const courseChat = await prisma.chat.findFirst({
      where: { courseId, courseType: CourseType.PROGRAM },
      select: { uuid: true },
    });

    return {
      enrolledCount: enrollments.length,
      maxParticipants: course.participants_max ?? undefined,
      isEnrolled,
      isAdmin,
      enableEnrolment: course.enable_enrolment,
      hideList: course.hide_participant_list,
      chatId: courseChat?.uuid,
      participants:
        isAdmin || course.hide_participant_list === false
          ? enrollments.map((enrollment_) => ({
              uuid: enrollment_.user.uuid,
              name: enrollment_.user.name,
            }))
          : [],
      // Markdown versions for editing
      descriptionMarkdown: isAdmin ? convertLexicalToMarkdown(course.description) : undefined,
      targetGroupMarkdown: isAdmin
        ? convertLexicalToMarkdown(course.target_group as SerializedEditorState)
        : undefined,
    };
  }),

  /**
   * Bulk fetch course statuses for multiple course IDs.
   */
  getCourseStatuses: publicProcedure
    .input(z.object({ courseIds: z.array(z.string()) }))
    .query(async ({ input, ctx }) => {
      const { prisma, user } = ctx;
      const { courseIds } = input;

      if (courseIds.length === 0) {
        return {};
      }

      const payload = await getPayload({ config });

      // Batch fetch all courses
      const coursesResult = await payload.find({
        collection: 'camp-schedule-entry',
        where: { id: { in: courseIds } },
        depth: 1,
        limit: courseIds.length,
      });

      const coursesMap = new Map(coursesResult.docs.map((c) => [c.id, c]));

      // Batch fetch all enrollments for these courses
      const allEnrollments = await prisma.enrollment.findMany({
        where: { courseId: { in: courseIds } },
        include: { user: true },
      });

      // Group enrollments by courseId
      const enrollmentsByCourse = new Map<string, typeof allEnrollments>();
      for (const enrollment of allEnrollments) {
        const existing = enrollmentsByCourse.get(enrollment.courseId) ?? [];
        existing.push(enrollment);
        enrollmentsByCourse.set(enrollment.courseId, existing);
      }

      // Batch fetch all course chats
      const courseChats = await prisma.chat.findMany({
        where: { courseId: { in: courseIds }, courseType: CourseType.PROGRAM },
        select: { uuid: true, courseId: true },
      });
      const chatsByCourse = new Map(courseChats.map((c) => [c.courseId, c.uuid]));

      // Build the result map
      const result: Record<
        string,
        {
          enrolledCount: number;
          maxParticipants: number | undefined;
          isEnrolled: boolean;
          isAdmin: boolean;
          enableEnrolment: boolean | null | undefined;
          hideList: boolean | null | undefined;
          chatId: string | undefined;
        }
      > = {};

      for (const courseId of courseIds) {
        const course = coursesMap.get(courseId);
        if (!course) continue;

        const enrollments = enrollmentsByCourse.get(courseId) ?? [];
        const isEnrolled = user
          ? enrollments.some((enrollment_) => enrollment_.userId === user.uuid)
          : false;
        const organisers = (course.organiser ?? []) as PayloadUser[];
        const isAdmin = user ? organisers.some((o) => o.id === user.uuid) : false;

        result[courseId] = {
          enrolledCount: enrollments.length,
          maxParticipants: course.participants_max ?? undefined,
          isEnrolled,
          isAdmin,
          enableEnrolment: course.enable_enrolment,
          hideList: course.hide_participant_list,
          chatId: chatsByCourse.get(courseId),
        };
      }

      return result;
    }),

  getMyEnrollments: publicProcedure.query(async ({ ctx }) => {
    const { user, prisma } = ctx;
    if (!user) return [];

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.uuid, courseType: CourseType.PROGRAM },
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
        depth: 0,
      });

      // Check if user is an organizer of this course
      const organisers = (course.organiser ?? []) as string[];
      const isOrganiser = organisers.includes(user.uuid);

      if (course.enable_enrolment === false) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Enrolment is not enabled for this course.',
        });
      }

      // Acquire advisory lock to prevent race condition when checking/updating capacity
      // This ensures only one enrollment can be processed at a time for this course
      await prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${courseId}))`;

      // Check capacity
      const currentCount = await prisma.enrollment.count({ where: { courseId } });
      if (
        course.participants_max !== null &&
        course.participants_max !== undefined &&
        currentCount >= course.participants_max
      ) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Course is already full.' });
      }

      // Check conflicts against other workshops (PROGRAM)
      const userEnrollments = await prisma.enrollment.findMany({
        where: { userId: user.uuid, courseType: CourseType.PROGRAM },
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
              code: 'CONFLICT',
              // Format: "Time conflict with [TITLE]|[ID]" - the ID is used for switch enrollment
              message: `Time conflict with ${other.title}|${other.id}`,
            });
          }
        }
      }

      // Cross-collection: also check against enrolled shifts (SHIFT)
      const userShiftEnrollments = await prisma.enrollment.findMany({
        where: { userId: user.uuid, courseType: CourseType.SHIFT },
      });

      if (userShiftEnrollments.length > 0) {
        const otherShifts = await payload.find({
          collection: 'helper-shifts',
          where: {
            id: { in: userShiftEnrollments.map((enrollment_) => enrollment_.courseId) },
          },
        });

        for (const other of otherShifts.docs) {
          if (
            isOverlapping(
              course.timeslot.time,
              course.timeslot.date,
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

      await prisma.enrollment.create({
        data: { userId: user.uuid, courseId, courseType: CourseType.PROGRAM },
      });

      // Add user to course group chat if it exists
      const courseChat = await prisma.chat.findFirst({
        where: { courseId, courseType: CourseType.PROGRAM },
        select: { uuid: true },
      });

      if (courseChat) {
        // Check if user is already a member (e.g., organizer)
        const existingMembership = await prisma.chatMembership.findUnique({
          where: {
            userId_chatId: {
              userId: user.uuid,
              chatId: courseChat.uuid,
            },
          },
        });

        if (!existingMembership) {
          // Add as ADMIN if organizer, otherwise GUEST
          await prisma.chatMembership.create({
            data: {
              userId: user.uuid,
              chatId: courseChat.uuid,
              chatPermission: isOrganiser
                ? ChatMembershipPermission.ADMIN
                : ChatMembershipPermission.GUEST,
            },
          });

          // Create system message for joining
          await prisma.message.create({
            data: {
              chatId: courseChat.uuid,
              type: MessageType.SYSTEM_MSG,
              contentVersions: {
                create: [{ payload: `${user.name} joined the group` }],
              },
              messageEvents: {
                create: [{ type: MessageEventType.CREATED }, { type: MessageEventType.STORED }],
              },
            },
          });

          // Update chat lastUpdate
          await prisma.chat.update({
            where: { uuid: courseChat.uuid },
            data: { lastUpdate: new Date() },
          });
        }
      }

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
        fromCourseType: z.enum(['workshop', 'shift']).optional().default('workshop'),
      }),
    )
    .use(ensureUserExistsMiddleware)
    .use(databaseTransactionWrapper)
    .mutation(async ({ input, ctx }) => {
      const { user, prisma } = ctx;

      const { fromCourseId, toCourseId, fromCourseType } = input;

      const payload = await getPayload({ config });

      // Fetch both courses with depth: 0 for consistent organizer ID checking
      const [fromCourse, toCourse] = await Promise.all([
        payload.findByID({
          collection: fromCourseType === 'shift' ? 'helper-shifts' : 'camp-schedule-entry',
          id: fromCourseId,
          depth: 0,
        }),
        payload.findByID({
          collection: 'camp-schedule-entry',
          id: toCourseId,
          depth: 0,
        }),
      ]);

      // Check if user is an organizer of each course
      const fromOrganisers =
        fromCourseType === 'workshop' && 'organiser' in fromCourse
          ? ((fromCourse.organiser ?? []) as string[])
          : [];
      const toOrganisers = (toCourse.organiser ?? []) as string[];
      const isFromOrganiser = fromOrganisers.includes(user.uuid);
      const isToOrganiser = toOrganisers.includes(user.uuid);

      // Verify user is enrolled in the from course
      const existingEnrollment = await prisma.enrollment.findFirst({
        where: {
          courseId: fromCourseId,
          userId: user.uuid,
        },
      });

      if (!existingEnrollment) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You are not enrolled in the course you are trying to switch from.',
        });
      }

      // Verify enrollment is enabled for the target course
      if (toCourse.enable_enrolment === false) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Enrollment is not enabled for the target course.',
        });
      }

      // Acquire advisory lock to prevent race condition when checking/updating capacity
      // This ensures only one enrollment can be processed at a time for the target course
      await prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${toCourseId}))`;

      // Check capacity of target course
      const currentCount = await prisma.enrollment.count({ where: { courseId: toCourseId } });
      if (
        toCourse.participants_max !== null &&
        toCourse.participants_max !== undefined &&
        currentCount >= toCourse.participants_max
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Target course is already full.',
        });
      }

      // Note: We don't verify overlap here - the client is calling this endpoint
      // because it received a time conflict error, so we trust the switch is intentional.

      // Check for other conflicts (excluding the course we're switching from).
      // Split by courseType so we query the correct Payload collection for each.
      const [remainingProgramEnrollments, remainingShiftEnrollments] = await Promise.all([
        prisma.enrollment.findMany({
          where: {
            userId: user.uuid,
            courseType: CourseType.PROGRAM,
            NOT: { courseId: fromCourseId },
          },
        }),
        prisma.enrollment.findMany({
          where: {
            userId: user.uuid,
            courseType: CourseType.SHIFT,
            NOT: { courseId: fromCourseId },
          },
        }),
      ]);

      // Check PROGRAM enrollments against camp-schedule-entry
      if (remainingProgramEnrollments.length > 0) {
        const otherCourses = await payload.find({
          collection: 'camp-schedule-entry',
          where: {
            id: { in: remainingProgramEnrollments.map((event_) => event_.courseId) },
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
              code: 'CONFLICT',
              message: `Time conflict with ${other.title}`,
            });
          }
        }
      }

      // Check SHIFT enrollments against helper-shifts
      if (remainingShiftEnrollments.length > 0) {
        const otherShifts = await payload.find({
          collection: 'helper-shifts',
          where: {
            id: { in: remainingShiftEnrollments.map((event_) => event_.courseId) },
          },
        });

        for (const other of otherShifts.docs) {
          if (
            isOverlapping(
              toCourse.timeslot.time,
              toCourse.timeslot.date,
              String(other.timeslot.time),
              String(other.timeslot.date),
            )
          ) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: `Time conflict with shift: ${String(other.title)}`,
            });
          }
        }
      }

      // Perform the switch atomically
      await prisma.enrollment.delete({
        where: {
          courseId_courseType_userId: {
            courseId: fromCourseId,
            courseType: fromCourseType === 'shift' ? CourseType.SHIFT : CourseType.PROGRAM,
            userId: user.uuid,
          },
        },
      });

      await prisma.enrollment.create({
        data: { userId: user.uuid, courseId: toCourseId, courseType: CourseType.PROGRAM },
      });

      // Handle chat membership changes
      // Remove from old course chat if exists
      const fromCourseChat = await prisma.chat.findFirst({
        where: { courseId: fromCourseId, courseType: CourseType.PROGRAM },
        select: { uuid: true },
      });

      if (fromCourseChat) {
        const fromMembership = await prisma.chatMembership.findUnique({
          where: {
            userId_chatId: {
              userId: user.uuid,
              chatId: fromCourseChat.uuid,
            },
          },
        });

        if (
          fromMembership && // Only remove if user is NOT an organizer of the old course
          !isFromOrganiser
        ) {
          await prisma.chatMembership.delete({
            where: {
              userId_chatId: {
                userId: user.uuid,
                chatId: fromCourseChat.uuid,
              },
            },
          });

          await prisma.message.create({
            data: {
              chatId: fromCourseChat.uuid,
              type: MessageType.SYSTEM_MSG,
              contentVersions: {
                create: [{ payload: `${user.name} left the group` }],
              },
              messageEvents: {
                create: [{ type: MessageEventType.CREATED }, { type: MessageEventType.STORED }],
              },
            },
          });

          await prisma.chat.update({
            where: { uuid: fromCourseChat.uuid },
            data: { lastUpdate: new Date() },
          });
        }
      }

      // Add to new course chat if exists
      const toCourseChat = await prisma.chat.findFirst({
        where: { courseId: toCourseId, courseType: CourseType.PROGRAM },
        select: { uuid: true },
      });

      if (toCourseChat) {
        const toMembership = await prisma.chatMembership.findUnique({
          where: {
            userId_chatId: {
              userId: user.uuid,
              chatId: toCourseChat.uuid,
            },
          },
        });

        if (!toMembership) {
          // Add as ADMIN if organizer, otherwise GUEST
          await prisma.chatMembership.create({
            data: {
              userId: user.uuid,
              chatId: toCourseChat.uuid,
              chatPermission: isToOrganiser
                ? ChatMembershipPermission.ADMIN
                : ChatMembershipPermission.GUEST,
            },
          });

          await prisma.message.create({
            data: {
              chatId: toCourseChat.uuid,
              type: MessageType.SYSTEM_MSG,
              contentVersions: {
                create: [{ payload: `${user.name} joined the group` }],
              },
              messageEvents: {
                create: [{ type: MessageEventType.CREATED }, { type: MessageEventType.STORED }],
              },
            },
          });

          await prisma.chat.update({
            where: { uuid: toCourseChat.uuid },
            data: { lastUpdate: new Date() },
          });
        }
      }

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

      // Remove user from course group chat if it exists
      const courseChat = await prisma.chat.findFirst({
        where: { courseId, courseType: CourseType.PROGRAM },
        select: { uuid: true },
      });

      if (courseChat) {
        const payload = await getPayload({ config });
        const course = await payload.findByID({
          collection: 'camp-schedule-entry',
          id: courseId,
          depth: 0,
        });
        const organisers = (course.organiser ?? []) as string[];

        // Check if user is a member
        const membership = await prisma.chatMembership.findUnique({
          where: {
            userId_chatId: {
              userId: user.uuid,
              chatId: courseChat.uuid,
            },
          },
        });

        if (membership && !organisers.includes(user.uuid)) {
          // Remove membership
          await prisma.chatMembership.delete({
            where: {
              userId_chatId: {
                userId: user.uuid,
                chatId: courseChat.uuid,
              },
            },
          });

          // Create system message for leaving
          await prisma.message.create({
            data: {
              chatId: courseChat.uuid,
              type: MessageType.SYSTEM_MSG,
              contentVersions: {
                create: [{ payload: `${user.name} left the group` }],
              },
              messageEvents: {
                create: [{ type: MessageEventType.CREATED }, { type: MessageEventType.STORED }],
              },
            },
          });

          // Update chat lastUpdate
          await prisma.chat.update({
            where: { uuid: courseChat.uuid },
            data: { lastUpdate: new Date() },
          });
        }
      }

      return { success: true };
    }),

  updateCourseDetails: trpcBaseProcedure
    .input(
      z.object({
        courseId: z.string(),
        description: z.string().optional(),
        targetGroup: z.string().optional(),
        maxParticipants: z.number().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { user, prisma } = ctx;

      const payload = await getPayload({ config });

      const course = await payload.findByID({
        collection: 'camp-schedule-entry',
        id: input.courseId,
        depth: 0,
      });

      const organisers = (course.organiser ?? []) as string[];
      if (!organisers.includes(user.uuid)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only organisers can update details.' });
      }

      // Validate maxParticipants
      if (input.maxParticipants !== undefined) {
        const currentCount = await prisma.enrollment.count({ where: { courseId: input.courseId } });
        if (input.maxParticipants < currentCount) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Max participants cannot be less than current enrolled count.',
          });
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: Record<string, any> = {};
      if (input.description !== undefined) {
        updateData['description'] = convertMarkdownToLexical(input.description);
      }
      if (input.targetGroup !== undefined) {
        updateData['target_group'] = convertMarkdownToLexical(input.targetGroup);
      }
      if (input.maxParticipants !== undefined) {
        updateData['participants_max'] = input.maxParticipants;
      }

      await payload.update({
        collection: 'camp-schedule-entry',
        id: input.courseId,
        data: updateData,
      });

      return { success: true };
    }),

  createWorkshopChat: trpcBaseProcedure
    .input(z.object({ courseId: z.string(), chatName: z.string() }))
    .use(databaseTransactionWrapper)
    .mutation(async ({ input, ctx }) => {
      const { user, prisma, locale } = ctx;

      const payload = await getPayload({ config });

      const course = await payload.findByID({
        collection: 'camp-schedule-entry',
        id: input.courseId,
        depth: 0,
      });

      const organisers = (course.organiser ?? []) as string[];
      if (!organisers.includes(user.uuid)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only organisers can create the group chat.',
        });
      }

      // Check if a chat already exists for this course
      const existingChat = await prisma.chat.findFirst({
        where: { courseId: input.courseId, courseType: CourseType.PROGRAM },
        select: { uuid: true },
      });

      if (existingChat) {
        return { chatId: existingChat.uuid };
      }

      const enrollments = await prisma.enrollment.findMany({
        where: { courseId: input.courseId },
        select: { userId: true },
      });

      // Filter out the current user from enrollments - they will be added as OWNER
      const enrolledMemberIds = enrollments
        .filter((enrollment_) => enrollment_.userId !== user.uuid)
        .map((enrollment_) => enrollment_.userId);

      // Get other organizers (not the current user) to add as ADMIN
      const otherOrganisers = organisers.filter((orgId) => orgId !== user.uuid);

      // Create the chat with COURSE_GROUP type
      const chat = await createNewChat(input.chatName, locale, user, [], prisma, {
        courseId: input.courseId,
        chatType: ChatType.COURSE_GROUP,
      });

      // Add other organizers as ADMIN
      for (const orgId of otherOrganisers) {
        await prisma.chatMembership.create({
          data: {
            userId: orgId,
            chatId: chat.uuid,
            chatPermission: ChatMembershipPermission.ADMIN,
          },
        });
      }

      // Add enrolled users as GUEST (can read but not send messages by default)
      await prisma.chatMembership.createMany({
        data: enrolledMemberIds.map((id) => ({
          userId: id,
          chatId: chat.uuid,
          chatPermission: ChatMembershipPermission.GUEST,
        })),
        skipDuplicates: true,
      });

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
            courseId_userId_courseType: {
              courseId,
              userId: user.uuid,
              courseType: CourseType.PROGRAM,
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
              courseId_userId_courseType: {
                courseId,
                userId: user.uuid,
                courseType: CourseType.PROGRAM,
              },
            },
            create: {
              courseId,
              userId: user.uuid,
              courseType: CourseType.PROGRAM,
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
