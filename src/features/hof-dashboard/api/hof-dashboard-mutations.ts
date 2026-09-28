import {
  countedSubmissions,
  findDashboardForms,
  idOf,
  needsAcceptance,
} from '@/features/hof-dashboard/api/hof-dashboard-data';
import type { HofDashboardArea, HofReviewChoice } from '@/features/hof-dashboard/constants';
import type { HofReviewer } from '@/features/hof-dashboard/payload-cms/hooks/record-hof-review';
import type { HofName } from '@/features/payload-cms/payload-cms/access-rules/can-access-hof-dashboard';
import type { Locale } from '@/types/types';
import { createLogger } from '@/utils/server-logger';
import config from '@payload-config';
import { TRPCError } from '@trpc/server';
import { getPayload } from 'payload';

const logger = createLogger('hof-dashboard:mutations');

/**
 * Takes back what a Hof handed in, e.g. with the wrong file attached, together with its files.
 * Only while the Ressort has not taken it up, and for a form of versions only the newest one:
 * an earlier version is what the Ressort answered on, and stays part of the record.
 */
export const withdrawHofSubmission = async (hof: HofName, submissionId: string): Promise<void> => {
  const payload = await getPayload({ config });
  const submission = await payload.findByID({
    collection: 'form-submissions',
    id: submissionId,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    select: { form: true, hof: true, hofReviewStatus: true, approved: true, hofFinal: true },
  });
  // another Hof's submission answers as a missing one, so its id tells nothing
  if (submission === null || idOf(submission.hof) !== hof.id) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'submission_missing' });
  }
  const formId = idOf(submission.form) ?? '';
  const form = await payload.findByID({
    collection: 'forms',
    id: formId,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    select: { hofDashboard: true },
  });
  if (form?.hofDashboard?.area === undefined || form.hofDashboard.area === null) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'submission_missing' });
  }

  let isLatest = true;
  if (form.hofDashboard.entries !== 'entries') {
    const { docs } = await payload.find({
      collection: 'form-submissions',
      where: { and: [{ form: { equals: formId } }, { hof: { equals: hof.id } }] },
      sort: '-createdAt',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      select: { createdAt: true },
    });
    isLatest = docs[0]?.id === submissionId;
  }
  const reviewed =
    submission.approved === true ||
    submission.hofFinal === true ||
    (submission.hofReviewStatus !== undefined && submission.hofReviewStatus !== null);
  if (reviewed || !isLatest) {
    throw new TRPCError({ code: 'CONFLICT', message: 'submission_locked' });
  }

  // the files first: a file left without its submission would be kept for good
  await payload.delete({
    collection: 'form_collection',
    where: { formSubmission: { equals: submissionId } },
    overrideAccess: true,
  });
  await payload.delete({ collection: 'form-submissions', id: submissionId, overrideAccess: true });

  logger.info('A Hof took back a submission', {
    'hof_dashboard.hof_id': hof.id,
    'hof_dashboard.form_id': formId,
  });
};

/**
 * Records the Ressort's answer on a Hof's submission: its status, or none to put it back to
 * handed in, the feedback the Hof reads next to it, and whether it is final. Accepting it is
 * the form builder's approval, as the approval link of an email gives it. Only for a form on
 * the dashboard.
 */
export const reviewHofSubmission = async ({
  hof,
  submissionId,
  status,
  feedback,
  final,
  reviewer,
}: {
  hof: HofName;
  submissionId: string;
  status: HofReviewChoice | undefined;
  feedback: string;
  /** Final: the Hof hands in no further version of the form. */
  final: boolean;
  /** Who answers, for the review history and the name next to the feedback. */
  reviewer: HofReviewer;
}): Promise<void> => {
  const payload = await getPayload({ config });
  const submission = await payload.findByID({
    collection: 'form-submissions',
    id: submissionId,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    select: { form: true, hof: true },
  });
  if (submission === null || idOf(submission.hof) !== hof.id) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'submission_missing' });
  }
  const form = await payload.findByID({
    collection: 'forms',
    id: idOf(submission.form) ?? '',
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    select: { hofDashboard: true },
  });
  if (form?.hofDashboard?.area === undefined || form.hofDashboard.area === null) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'submission_missing' });
  }

  await payload.update({
    collection: 'form-submissions',
    id: submissionId,
    data: {
      approved: status === 'accepted',
      // eslint-disable-next-line unicorn/no-null -- Payload clears a field only with null
      hofReviewStatus: status === 'accepted' || status === undefined ? null : status,
      hofFeedback: feedback,
      hofFinal: final,
    },
    depth: 0,
    overrideAccess: true,
    context: { hofReviewer: reviewer },
  });

  logger.info('A reviewer answered a Hof submission', {
    'hof_dashboard.hof_id': hof.id,
    'hof_dashboard.review_status': status ?? 'submitted',
    'hof_dashboard.review_final': final,
  });
};

/**
 * Accepts everything that counts of one Hof in one area at once, as a reviewer would one by
 * one: every entry, and the newest version of a form of versions, which is also made final so
 * the Hof hands in no further one. Earlier versions and the feedback stay as they are. A form
 * the Hof has not handed in stays missing. Returns how many submissions changed.
 */
export const acceptHofArea = async ({
  hof,
  area,
  locale,
  reviewer,
}: {
  hof: HofName;
  area: HofDashboardArea;
  /** The reader's language, so the forms are the ones their dashboard shows. */
  locale: Locale;
  reviewer: HofReviewer;
}): Promise<number> => {
  const payload = await getPayload({ config });
  const dashboardForms = await findDashboardForms(payload, locale);
  const forms = dashboardForms.filter((form) => form.hofDashboard?.area === area);
  if (forms.length === 0) return 0;

  const { docs } = await payload.find({
    collection: 'form-submissions',
    where: {
      and: [{ hof: { equals: hof.id } }, { form: { in: forms.map((form) => form.id) } }],
    },
    sort: '-createdAt',
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { form: true, approved: true, hofFinal: true },
  });

  let accepted = 0;
  for (const form of forms) {
    const versions = form.hofDashboard?.entries !== 'entries';
    for (const submission of countedSubmissions(form, docs)) {
      if (!needsAcceptance(submission, versions)) continue;
      // one at a time, so the review history names the reviewer on every one of them
      await payload.update({
        collection: 'form-submissions',
        id: submission.id,
        data: {
          approved: true,
          // eslint-disable-next-line unicorn/no-null -- Payload clears a field only with null
          hofReviewStatus: null,
          ...(versions ? { hofFinal: true } : {}),
        },
        depth: 0,
        overrideAccess: true,
        context: { hofReviewer: reviewer },
      });
      accepted += 1;
    }
  }

  logger.info('A reviewer accepted an area of a Hof at once', {
    'hof_dashboard.hof_id': hof.id,
    'hof_dashboard.area': area,
    'hof_dashboard.accepted': accepted,
  });
  return accepted;
};
