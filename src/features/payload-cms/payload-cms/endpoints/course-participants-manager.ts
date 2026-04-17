import { canAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
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

      await prisma.enrollment.upsert({
        where: {
          courseId_userId: {
            courseId,
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
