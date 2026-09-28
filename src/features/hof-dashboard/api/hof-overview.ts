import {
  countedSubmissions,
  findDashboardForms,
  idOf,
  isClosedAtDeadline,
  needsAcceptance,
  statusOf,
} from '@/features/hof-dashboard/api/hof-dashboard-data';
import { HOF_DASHBOARD_AREAS, type HofDashboardArea } from '@/features/hof-dashboard/constants';
import { getSubmissionProgress } from '@/features/hof-dashboard/utils/submission-progress';
import type { HofName } from '@/features/payload-cms/payload-cms/access-rules/can-access-hof-dashboard';
import type { FormSubmission } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import { createLogger } from '@/utils/server-logger';
import config from '@payload-config';
import { getPayload } from 'payload';

const logger = createLogger('hof-dashboard:overview');

/** Most submissions the overview reads over every Hof; far more than the camp will have. */
const MAX_SUBMISSIONS = 20_000;

/** Where one Hof stands in one area, as the reviewers' overview counts it. */
export interface HofAreaSummary {
  /** Forms of the area on the dashboard. */
  forms: number;
  /** Forms handed in and not sent back for a revision. */
  done: number;
  /** Forms still missing, or to revise, past their due date. */
  overdue: number;
  /** Submissions that count and wait for the Ressort: handed in or in review. */
  toReview: number;
  /** Submissions that count and are not yet accepted, or not yet final for a form of versions. */
  toAccept: number;
}

/** One Hof in the reviewers' overview. */
export interface HofOverviewRow {
  id: string;
  name: string;
  areas: Record<HofDashboardArea, HofAreaSummary>;
  /**
   * What the Hof's ZIP holds: the files it handed in with any submission of a form on the
   * dashboard, and a PDF of each such submission.
   */
  files: number;
}

type OverviewSubmission = Pick<
  FormSubmission,
  'id' | 'form' | 'hof' | 'approved' | 'hofReviewStatus' | 'hofFinal'
>;

/**
 * Where every given Hof stands, area by area, for the reviewers: how many forms it has handed
 * in, how many are overdue, and what still waits for the Ressort. Counted as each Hof's own
 * dashboard counts them.
 */
export const getHofOverview = async (
  hoefe: readonly HofName[],
  locale: Locale,
): Promise<HofOverviewRow[]> => {
  const payload = await getPayload({ config });
  const forms = await findDashboardForms(payload, locale);

  const submissions =
    forms.length === 0 || hoefe.length === 0
      ? { docs: [], totalDocs: 0 }
      : await payload.find({
          collection: 'form-submissions',
          where: {
            and: [
              { form: { in: forms.map((form) => form.id) } },
              { hof: { in: hoefe.map((hof) => hof.id) } },
            ],
          },
          sort: '-createdAt',
          depth: 0,
          limit: MAX_SUBMISSIONS,
          overrideAccess: true,
          select: { form: true, hof: true, approved: true, hofReviewStatus: true, hofFinal: true },
        });
  if (submissions.totalDocs > submissions.docs.length) {
    logger.warn('The Höfe have more submissions than the overview reads', {
      'hof_dashboard.submissions': submissions.totalDocs,
    });
  }
  const stored = submissions.docs as OverviewSubmission[];

  const { docs: files } =
    stored.length === 0
      ? { docs: [] }
      : await payload.find({
          collection: 'form_collection',
          where: { formSubmission: { in: stored.map((submission) => submission.id) } },
          depth: 0,
          pagination: false,
          overrideAccess: true,
          select: { formSubmission: true },
        });
  const hofOfSubmission = new Map(
    stored.map((submission) => [submission.id, idOf(submission.hof)]),
  );
  const filesByHof = new Map<string, number>();
  for (const submission of stored) {
    const hofId = idOf(submission.hof);
    if (hofId !== undefined) filesByHof.set(hofId, (filesByHof.get(hofId) ?? 0) + 1);
  }
  for (const file of files) {
    const hofId = hofOfSubmission.get(idOf(file.formSubmission) ?? '');
    if (hofId !== undefined) filesByHof.set(hofId, (filesByHof.get(hofId) ?? 0) + 1);
  }

  const now = new Date();
  return hoefe.map((hof): HofOverviewRow => {
    const ofHof = stored.filter((submission) => idOf(submission.hof) === hof.id);
    const areas = Object.fromEntries(
      HOF_DASHBOARD_AREAS.map((area): [HofDashboardArea, HofAreaSummary] => {
        const summary: HofAreaSummary = { forms: 0, done: 0, overdue: 0, toReview: 0, toAccept: 0 };
        for (const form of forms) {
          if (form.hofDashboard?.area !== area) continue;
          const versions = form.hofDashboard.entries !== 'entries';
          const counted = countedSubmissions(form, ofHof);
          const statuses = counted.map((submission) => statusOf(submission));
          const progress = getSubmissionProgress(
            {
              mode: versions ? 'versions' : 'entries',
              deadline: form.hofDashboard.deadline ?? undefined,
              statuses,
              closed:
                isClosedAtDeadline(form.hofDashboard, now) ||
                (versions && counted[0]?.hofFinal === true),
            },
            now,
          );
          summary.forms += 1;
          if (progress.state === 'done') summary.done += 1;
          if (progress.state === 'overdue') summary.overdue += 1;
          summary.toReview += statuses.filter(
            (status) => status === 'submitted' || status === 'inReview',
          ).length;
          summary.toAccept += counted.filter((submission) =>
            needsAcceptance(submission, versions),
          ).length;
        }
        return [area, summary];
      }),
    ) as Record<HofDashboardArea, HofAreaSummary>;
    return { id: hof.id, name: hof.name, areas, files: filesByHof.get(hof.id) ?? 0 };
  });
};
