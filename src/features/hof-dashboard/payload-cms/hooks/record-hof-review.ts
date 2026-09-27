import { environmentVariables } from '@/config/environment-variables';
import type { HofReviewChoice } from '@/features/hof-dashboard/constants';
import type { FormSubmission } from '@/features/payload-cms/payload-types';
import { formatUserFullName } from '@/utils/format-user-name';
import type { CollectionBeforeChangeHook } from 'payload';

/** Who made a change, when it comes through the dashboard rather than a Payload session. */
export interface HofReviewer {
  id: string;
  name: string;
}

/**
 * Adds a line to the review history whenever the status, the approval, the feedback or the
 * final mark of a Hof's submission changes, in the admin panel, on the dashboard or through the
 * approval link of an email: who, when, and what they set. The dashboard and the approval link
 * write through the local API without a user, so they name who it was in `context.hofReviewer`.
 */
export const recordHofReview: CollectionBeforeChangeHook<FormSubmission> = ({
  data,
  originalDoc,
  req,
  operation,
  context,
}) => {
  if (operation !== 'update' || !environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD) return data;
  // only a submission of a Hof is reviewed on the dashboard
  const hof = 'hof' in data ? data.hof : originalDoc?.hof;
  if (hof === undefined || hof === null || hof === '') return data;

  const answerOf = (
    submission: Partial<FormSubmission> | undefined,
  ): { status: HofReviewChoice | undefined; feedback: string; final: boolean } => ({
    // approval, however it was given, is the answer "accepted"
    status: submission?.approved === true ? 'accepted' : (submission?.hofReviewStatus ?? undefined),
    feedback: submission?.hofFeedback ?? '',
    final: submission?.hofFinal === true,
  });
  const before = answerOf(originalDoc);
  const after = answerOf({ ...originalDoc, ...data });
  if (
    before.status === after.status &&
    before.feedback === after.feedback &&
    before.final === after.final
  ) {
    return data;
  }

  const fromDashboard = context['hofReviewer'] as HofReviewer | undefined;
  const user = req.user;
  const reviewer =
    fromDashboard ??
    (user === null
      ? undefined
      : {
          id: user.id,
          name: formatUserFullName(
            (user as { fullName?: string }).fullName,
            (user as { nickname?: string | null }).nickname,
          ),
        });

  data.hofReviewLog = [
    ...(originalDoc?.hofReviewLog ?? []),
    {
      changedAt: new Date().toISOString(),
      reviewerName: reviewer?.name ?? '',
      // eslint-disable-next-line unicorn/no-null -- Payload clears a relationship only with null
      reviewer: reviewer === undefined || reviewer.id === '' ? null : reviewer.id,
      // eslint-disable-next-line unicorn/no-null -- Payload clears a select only with null
      status: after.status ?? null,
      feedback: after.feedback,
      final: after.final,
    },
  ];
  return data;
};
