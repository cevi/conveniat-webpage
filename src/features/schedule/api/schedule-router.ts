import { createTRPCRouter, trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import { z } from 'zod';

const enrollInCourseSchema = z.object({
  courseId: z.string().regex(/^[0-9a-f]{24}$/), // Assuming MongoDB ObjectId
});

export const scheduleRouter = createTRPCRouter({
  enrollInCourse: trpcBaseProcedure
    .input(enrollInCourseSchema)
    .use(databaseTransactionWrapper) // Ensure database transaction is used
    .mutation(async ({ input, ctx }) => {
      const { user, prisma } = ctx;
      const { courseId } = input;

      // TODO: validate that the course exists in the mongo database
      // TODO: check that there are no overlaps with existing enrollments

      console.log(`Enrolling user ${user.nickname} in course ${courseId}`);

      // TODO: check max number of participants not exceeded,
      //    all others are added to a waiting list

      await prisma.enrollment.create({
        data: {
          userId: user.uuid,
          courseId: courseId,
        },
      });

      return { success: true };
    }),

  unenrollFromCourse: trpcBaseProcedure
    .input(enrollInCourseSchema)
    .use(databaseTransactionWrapper) // Ensure database transaction is used
    .mutation(async ({ input, ctx }) => {
      const { user, prisma } = ctx;
      const { courseId } = input;

      console.log(`Unenrolling user ${user.nickname} from course ${courseId}`);

      await prisma.enrollment.deleteMany({
        where: {
          userId: user.uuid,
          courseId: courseId,
        },
      });

      return { success: true };
    }),
});
