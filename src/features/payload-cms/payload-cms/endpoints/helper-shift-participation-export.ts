import { canAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import {
  QUERY_LIMIT,
  findExportParticipants,
  participationWorkbookResponse,
  resolveExportLocale,
} from '@/features/payload-cms/payload-cms/endpoints/participation-export';
import type { CourseSummary } from '@/features/payload-cms/payload-cms/utils/course-participation';
import { aggregateCourseParticipation } from '@/features/payload-cms/payload-cms/utils/course-participation';
import prisma from '@/lib/db/prisma';
import { CourseType } from '@/lib/prisma';
import type { PayloadHandler } from 'payload';

/**
 * Exports an Excel workbook listing every helper that is enrolled in at least one helper shift,
 * together with their contact details, the number of shifts, the total hours derived from the
 * shift time slots and the titles of those shifts.
 *
 * Organisers are not part of this list — they are exported separately, see
 * `endpoints/course-organiser-export.ts`.
 *
 * Exposed on the `helper-shifts` collection as `GET /api/helper-shifts/participation-export`.
 */
export const helperShiftParticipationExportHandler: PayloadHandler = async (request) => {
  try {
    const hasAccess = await canAccessAdminPanel({ req: request });
    if (!hasAccess) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const locale = resolveExportLocale(request);

    const shiftsResult = await request.payload.find({
      collection: 'helper-shifts',
      limit: QUERY_LIMIT,
      depth: 0,
      locale,
    });

    const courses: CourseSummary[] = shiftsResult.docs.map((shift) => ({
      id: shift.id,
      title: shift.title,
      date: shift.timeslot.date,
      time: shift.timeslot.time,
    }));

    const enrollments = await prisma.enrollment.findMany({
      where: { courseType: CourseType.SHIFT },
      select: { userId: true, courseId: true },
    });

    const userIds = [...new Set(enrollments.map((enrollment) => enrollment.userId))];
    const participants = await findExportParticipants(request, userIds);

    const rows = aggregateCourseParticipation({ courses, assignments: enrollments, participants });

    return await participationWorkbookResponse(rows, {
      worksheetName: 'Schichteinsätze',
      fileName: 'Schichteinsaetze_Helfende.xlsx',
      countHeader: 'Anzahl Schichteinsätze',
      titlesHeader: 'Schichteinsätze',
    });
  } catch (error) {
    request.payload.logger.error({ err: error }, 'Failed to export helper shift participation');
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
};
