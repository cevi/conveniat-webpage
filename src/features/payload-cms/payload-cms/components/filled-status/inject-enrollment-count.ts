import prisma from '@/lib/db/prisma';
import type { CollectionAfterReadHook } from 'payload';

/**
 * After-read hook that injects the current enrollment count into the document.
 * This is used by the FilledStatusCell in the Payload CMS admin list view.
 *
 * We only run the DB query when we're in the admin context (it adds overhead).
 */
export const injectEnrollmentCount: CollectionAfterReadHook = async ({ doc, req }) => {
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
    where: { courseId: documentId },
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return { ...doc, enrolledCount: count };
};
