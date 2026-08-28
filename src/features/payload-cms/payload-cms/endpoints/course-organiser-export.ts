import { canAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import type { ParticipationExportLabels } from '@/features/payload-cms/payload-cms/endpoints/participation-export';
import {
  QUERY_LIMIT,
  findExportParticipants,
  participationWorkbookResponse,
  resolveExportLocale,
} from '@/features/payload-cms/payload-cms/endpoints/participation-export';
import {
  aggregateCourseParticipation,
  extractOrganiserAssignments,
} from '@/features/payload-cms/payload-cms/utils/course-participation';
import type { PayloadHandler } from 'payload';

/** The two collections that carry an `organiser` relation and a `timeslot`. */
type OrganisedCollection = 'helper-shifts' | 'camp-schedule-entry';

/**
 * Builds the handler behind an organiser export.
 *
 * The workbook lists every user that organises at least one document of `collection`, together
 * with their contact details, the number of documents they organise, the total hours derived from
 * the time slots and the titles of those documents. Organisers are deliberately kept apart from
 * the enrolled participants, and helper shifts from schedule entries, so that the resulting lists
 * can be used on their own.
 */
export const makeCourseOrganiserExportHandler = ({
  collection,
  labels,
}: {
  collection: OrganisedCollection;
  labels: ParticipationExportLabels;
}): PayloadHandler => {
  return async (request) => {
    try {
      const hasAccess = await canAccessAdminPanel({ req: request });
      if (!hasAccess) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const locale = resolveExportLocale(request);

      const result = await request.payload.find({
        collection,
        limit: QUERY_LIMIT,
        depth: 0,
        locale,
      });

      const { courses, assignments } = extractOrganiserAssignments(result.docs);

      const userIds = [...new Set(assignments.map((assignment) => assignment.userId))];
      const participants = await findExportParticipants(request, userIds);

      const rows = aggregateCourseParticipation({ courses, assignments, participants });

      return await participationWorkbookResponse(rows, labels);
    } catch (error) {
      request.payload.logger.error(
        { err: error },
        `Failed to export the organisers of ${collection}`,
      );
      return Response.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  };
};

/** `GET /api/helper-shifts/organiser-export` — hours per helper shift organiser. */
export const helperShiftOrganiserExportHandler = makeCourseOrganiserExportHandler({
  collection: 'helper-shifts',
  labels: {
    worksheetName: 'Organisatoren',
    fileName: 'Schichteinsaetze_Organisatoren.xlsx',
    countHeader: 'Anzahl Schichteinsätze',
    titlesHeader: 'Schichteinsätze',
  },
});

/** `GET /api/camp-schedule-entry/organiser-export` — hours per programme element organiser. */
export const campScheduleOrganiserExportHandler = makeCourseOrganiserExportHandler({
  collection: 'camp-schedule-entry',
  labels: {
    worksheetName: 'Organisatoren',
    fileName: 'Programmbloecke_Organisatoren.xlsx',
    countHeader: 'Anzahl Programmblöcke',
    titlesHeader: 'Programmblöcke',
  },
});
