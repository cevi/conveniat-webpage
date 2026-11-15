import {
  canManageHelperShifts,
  hasAdminOrWebAccess,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import type { PayloadRequest } from 'payload';

/**
 * Whether the request may read or change the enrolments of a course of this collection: the
 * Schichteinsätze belong to whoever plans them, the Helferpool included, the Programmblöcke to
 * the admins and the web core team.
 */
export const canManageCourseEnrolments = (
  request: PayloadRequest,
  collection: 'helper-shifts' | 'camp-schedule-entry',
): boolean =>
  collection === 'helper-shifts'
    ? canManageHelperShifts({ req: request })
    : hasAdminOrWebAccess({ req: request });

/** The collection a course endpoint was called on, read off its path. */
export const courseCollectionOf = (
  url: string | undefined,
): 'helper-shifts' | 'camp-schedule-entry' =>
  typeof url === 'string' && url.includes('camp-schedule-entry')
    ? 'camp-schedule-entry'
    : 'helper-shifts';
