import prisma from '@/lib/db/prisma';
import type { CourseType } from '@/lib/prisma';
import type { CollectionAfterReadHook } from 'payload';

/**
 * Factory that returns an after-read hook which injects the current enrollment count
 * into the document. Scoped to a specific {@link CourseType} so that the count only
 * reflects enrollments of the matching collection type.
 *
 * This is used by the FilledStatusCell in the Payload CMS admin list view.
 * We only run the DB query when we're in the admin context (it adds overhead).
 */
export const makeInjectEnrollmentCount = (courseType: CourseType): CollectionAfterReadHook => {
  const hook: CollectionAfterReadHook = async ({ doc, req }) => {
    // Only run during admin panel rendering (not public API calls)
    const referer = req.headers.get('referer');
    if (!referer?.includes('/admin')) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return doc;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const documentId: unknown = doc?.id;
    if (typeof documentId !== 'string') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return doc;
    }

    const count = await prisma.enrollment.count({
      where: { courseId: documentId, courseType },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return { ...doc, enrolledCount: count };
  };

  return hook;
};
