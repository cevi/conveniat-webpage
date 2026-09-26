'use client';

import type { HofSubmissionType } from '@/features/hof-dashboard/constants';
import { notifyFailure } from '@/features/hof-dashboard/utils/notify-failure';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';

/**
 * Saves the Hof's answer to "elevated safety risk?". The answer shows at once, before the
 * server has it, since on camp wifi the round trip takes seconds; if saving fails, the
 * previous answer comes back and the user is told.
 */
export const useSafetyRiskAnswer = (
  hofId: string,
  locale: Locale,
): ((submissionType: HofSubmissionType, elevatedSafetyRisk: 'yes' | 'no') => void) => {
  const utils = trpc.useUtils();
  const dashboard = utils.hofDashboard.getHofDashboard;
  const mutation = trpc.hofDashboard.updateSafetyRisk.useMutation({
    // fail right away without signal instead of waiting paused for it
    networkMode: 'always',
    onMutate: async ({ submissionType, elevatedSafetyRisk }) => {
      await dashboard.cancel({ hofId });
      const previous = dashboard.getData({ hofId });
      dashboard.setData({ hofId }, (current) =>
        current === undefined
          ? current
          : {
              ...current,
              submissions: current.submissions.map((submission) =>
                submission.type === submissionType
                  ? { ...submission, elevatedSafetyRisk }
                  : submission,
              ),
            },
      );
      return { previous };
    },
    onError: (_error, _answer, context) => {
      dashboard.setData({ hofId }, context?.previous);
      notifyFailure(locale, 'saveFailed');
    },
    onSettled: () => dashboard.invalidate({ hofId }),
  });
  return (submissionType, elevatedSafetyRisk) =>
    mutation.mutate({ hofId, submissionType, elevatedSafetyRisk });
};
