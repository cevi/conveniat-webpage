import { idOf } from '@/features/hof-dashboard/api/hof-dashboard-data';
import type { HofReviewStatus } from '@/features/hof-dashboard/constants';
import type { HofName } from '@/features/payload-cms/payload-cms/access-rules/can-access-hof-dashboard';
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
    select: { form: true, hof: true, hofReviewStatus: true, approved: true },
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
 * handed in, and the feedback the Hof reads next to it. Only for a form on the dashboard.
 */
export const reviewHofSubmission = async ({
  hof,
  submissionId,
  status,
  feedback,
}: {
  hof: HofName;
  submissionId: string;
  status: HofReviewStatus | undefined;
  feedback: string;
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
    // eslint-disable-next-line unicorn/no-null -- Payload clears a field only with null
    data: { hofReviewStatus: status ?? null, hofFeedback: feedback },
    depth: 0,
    overrideAccess: true,
  });

  logger.info('A reviewer answered a Hof submission', {
    'hof_dashboard.hof_id': hof.id,
    'hof_dashboard.review_status': status ?? 'submitted',
  });
};
