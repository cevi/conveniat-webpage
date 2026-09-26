'use client';

import type { HofSubmissionType } from '@/features/hof-dashboard/constants';
import { notifyFailure } from '@/features/hof-dashboard/utils/notify-failure';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Saves the Hof's answer to "elevated safety risk?". The answer shows at once, before the
 * server has it, since on camp wifi the round trip takes seconds; if saving fails, the
 * previous answer comes back and the user is told.
 *
 * The answers of one Hof are sent one after the other, so a quick correction is the one the
 * server keeps. While a later answer is still on its way, an earlier one neither reloads the
 * dashboard nor puts its old answer back, which would show the corrected answer undone for a
 * moment or for good.
 */
export const useSafetyRiskAnswer = (
  hofId: string,
  locale: Locale,
): ((submissionType: HofSubmissionType, elevatedSafetyRisk: 'yes' | 'no') => void) => {
  const utils = trpc.useUtils();
  const queryClient = useQueryClient();
  const dashboard = utils.hofDashboard.getHofDashboard;
  const scope = `hof-safety-risk-${hofId}`;
  const laterAnswerPending = (answer: unknown): boolean =>
    queryClient.isMutating({
      predicate: (mutation) =>
        mutation.options.scope?.id === scope && mutation.state.variables !== answer,
    }) > 0;

  const mutation = trpc.hofDashboard.updateSafetyRisk.useMutation({
    // fail right away without signal instead of waiting paused for it
    networkMode: 'always',
    scope: { id: scope },
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
    onError: (_error, answer, context) => {
      notifyFailure(locale, 'saveFailed');
      if (!laterAnswerPending(answer)) dashboard.setData({ hofId }, context?.previous);
    },
    onSettled: async (_data, _error, answer) => {
      if (!laterAnswerPending(answer)) await dashboard.invalidate({ hofId });
    },
  });
  return (submissionType, elevatedSafetyRisk) =>
    mutation.mutate({ hofId, submissionType, elevatedSafetyRisk });
};
