import { environmentVariables } from '@/config/environment-variables';
import type { FormSubmission } from '@/features/payload-cms/payload-types';
import { formatUserFullName } from '@/utils/format-user-name';
import type { CollectionBeforeChangeHook } from 'payload';

/** Who made a change, when it comes through the dashboard rather than a Payload session. */
export interface HofReviewer {
  id: string;
  name: string;
}

/**
 * Adds a line to the review history whenever the status or the feedback of a Hof's submission
 * changes, in the admin panel or on the dashboard: who, when, and what they set. The dashboard
 * writes through the local API without a user, so it names the reviewer in
 * `context.hofReviewer`.
 */
export const recordHofReview: CollectionBeforeChangeHook<FormSubmission> = ({
  data,
  originalDoc,
  req,
  operation,
  context,
}) => {
  if (operation !== 'update' || !environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD) return data;
  const status = 'hofReviewStatus' in data ? data.hofReviewStatus : originalDoc?.hofReviewStatus;
  const feedback = 'hofFeedback' in data ? data.hofFeedback : originalDoc?.hofFeedback;
  const changed =
    (status ?? undefined) !== (originalDoc?.hofReviewStatus ?? undefined) ||
    (feedback ?? '') !== (originalDoc?.hofFeedback ?? '');
  if (!changed) return data;

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
      reviewer: reviewer?.id ?? null,
      // eslint-disable-next-line unicorn/no-null -- Payload clears a select only with null
      status: status ?? null,
      feedback: feedback ?? '',
    },
  ];
  return data;
};
