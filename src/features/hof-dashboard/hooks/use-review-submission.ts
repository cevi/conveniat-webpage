'use client';

import type { HofReviewStatus } from '@/features/hof-dashboard/constants';
import { translate } from '@/features/hof-dashboard/texts';
import { notifyFailure } from '@/features/hof-dashboard/utils/notify-failure';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { toast } from 'sonner';

/**
 * Saves the Ressort's status and feedback on a submission and reloads the dashboard, so the
 * card shows what the Hof now reads. Resolves to whether it was saved.
 */
export const useReviewSubmission = (
  hofId: string,
  locale: Locale,
): {
  review: (
    submissionId: string,
    status: HofReviewStatus | undefined,
    feedback: string,
  ) => Promise<boolean>;
  isPending: boolean;
} => {
  const utils = trpc.useUtils();
  // fail right away without signal instead of waiting paused for it, so the user hears of it
  const mutation = trpc.hofDashboard.updateSubmissionReview.useMutation({ networkMode: 'always' });

  const review = async (
    submissionId: string,
    status: HofReviewStatus | undefined,
    feedback: string,
  ): Promise<boolean> => {
    try {
      await mutation.mutateAsync({ hofId, submissionId, status, feedback });
      toast.success(translate('saved', locale));
      await utils.hofDashboard.getHofDashboard.invalidate({ hofId });
      return true;
    } catch {
      notifyFailure(locale, 'saveFailed');
      return false;
    }
  };
  return { review, isPending: mutation.isPending };
};
