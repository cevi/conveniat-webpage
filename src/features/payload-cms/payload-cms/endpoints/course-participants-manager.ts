import { canAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import { isOverlapping } from '@/features/schedule/utils/time-utils';
import prisma from '@/lib/db/prisma';
import type { PayloadHandler } from 'payload';

export const handleParticipantMutation: PayloadHandler = async (request) => {
  try {
    const hasAccess = await canAccessAdminPanel({ req: request });
    if (!hasAccess) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, routeParams, method } = request;
    const courseId = (routeParams as { id?: string }).id;
    if (courseId === undefined || courseId === '') {
      return Response.json({ error: 'Missing course ID' }, { status: 400 });
    }

    let courseType: 'SHIFT' | 'PROGRAM' = 'SHIFT';
    if (typeof url === 'string' && url.includes('camp-schedule-entry')) {
      courseType = 'PROGRAM';
    }

    if (method === 'POST') {
      const body = request.json
        ? ((await request.json()) as { userId?: string })
        : (request as unknown as { data?: { userId?: string } }).data;
      const userId = body?.userId;
      if (userId === undefined || userId === '') {
        return Response.json({ error: 'Missing userId' }, { status: 400 });
      }

      // Pre-flight fallback: Ensure the User exists in Prisma, as sometimes they are only in Mongo.
      try {
        const payloadUser = await request.payload.findByID({
          collection: 'users',
          id: userId,
          depth: 0,
        });

        await prisma.user.upsert({
          where: { uuid: userId },
          update: { name: String(payloadUser.fullName) },
          create: {
            uuid: userId,
            name: String(payloadUser.fullName),
            lastSeen: new Date('1970-01-01T00:00:00Z'),
          },
        });
      } catch {
        return Response.json(
          { error: 'Target user does not exist in the database.' },
          { status: 404 },
        );
      }

      // Conflict validation logic
      const targetCollection = courseType === 'SHIFT' ? 'helper-shifts' : 'camp-schedule-entry';
      let course;
      try {
        course = await request.payload.findByID({
          collection: targetCollection,
          id: courseId,
          depth: 0,
        });
      } catch {
        return Response.json({ error: 'Course not found' }, { status: 404 });
      }

      // Check max capacity
      const currentCount = await prisma.enrollment.count({
        where: { courseId, courseType, userId: { not: userId } },
      });
      if (
        course.participants_max !== null &&
        course.participants_max !== undefined &&
        currentCount >= course.participants_max
      ) {
        return Response.json({ error: 'This course is already full.' }, { status: 400 });
      }

      // Check time overlap
      const userEnrollments = await prisma.enrollment.findMany({
        where: { userId, courseId: { not: courseId } },
      });

      if (userEnrollments.length > 0) {
        const activeShifts = userEnrollments.filter(
          (enrollment) => enrollment.courseType === 'SHIFT',
        );
        const activePrograms = userEnrollments.filter(
          (enrollment) => enrollment.courseType === 'PROGRAM',
        );

        if (activeShifts.length > 0) {
          const otherShifts = await request.payload.find({
            collection: 'helper-shifts',
            where: { id: { in: activeShifts.map((enrollment) => enrollment.courseId) } },
          });

          for (const other of otherShifts.docs) {
            if (
              isOverlapping(
                String(course.timeslot.time),
                String(course.timeslot.date),
                String(other.timeslot.time),
                String(other.timeslot.date),
              )
            ) {
              return Response.json(
                { error: `Time conflict with shift: ${String(other.title)}` },
                { status: 400 },
              );
            }
          }
        }

        if (activePrograms.length > 0) {
          const otherPrograms = await request.payload.find({
            collection: 'camp-schedule-entry',
            where: { id: { in: activePrograms.map((enrollment) => enrollment.courseId) } },
          });

          for (const other of otherPrograms.docs) {
            if (
              isOverlapping(
                String(course.timeslot.time),
                String(course.timeslot.date),
                String(other.timeslot.time),
                String(other.timeslot.date),
              )
            ) {
              return Response.json(
                { error: `Time conflict with programme/workshop: ${String(other.title)}` },
                { status: 400 },
              );
            }
          }
        }
      }

      await prisma.enrollment.upsert({
        where: {
          courseId_courseType_userId: {
            courseId,
            courseType,
            userId,
          },
        },
        update: {},
        create: {
          courseId,
          userId,
          courseType,
        },
      });

      return Response.json({ success: true });
    }

    if (method === 'DELETE') {
      const searchParameters = new URL(url ?? '', 'http://localhost').searchParams;
      const userId = searchParameters.get('userId');
      if (userId === null || userId === '') {
        return Response.json({ error: 'Missing userId in query parameters' }, { status: 400 });
      }

      await prisma.enrollment.deleteMany({
        where: {
          courseId,
          userId,
          courseType,
        },
      });

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    request.payload.logger.error({ err: error }, 'Failed to mutate participant');
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
};
