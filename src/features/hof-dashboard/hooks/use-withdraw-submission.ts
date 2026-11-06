'use client';
import { toast } from '@/components/ui/toast';
import { translate } from '@/features/hof-dashboard/texts';
import { notifyFailure } from '@/features/hof-dashboard/utils/notify-failure';
import { useTRPC } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { TRPCClientError } from '@trpc/client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Takes back a submission of the Hof and reloads the dashboard. When the Ressort took it up
 * in the meantime, it says so and shows the Ressort's status instead.
 */
export const useWithdrawSubmission = (
  hofId: string,
  locale: Locale,
): ((submissionId: string) => Promise<void>) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  // fail right away without signal instead of waiting paused for it, so the user hears of it
  const withdraw = useMutation(
    trpc.hofDashboard.deleteSubmission.mutationOptions({ networkMode: 'always' }),
  );

  return async (submissionId: string): Promise<void> => {
    try {
      await withdraw.mutateAsync({ hofId, submissionId });
      toast.success(translate('withdrawDone', locale));
    } catch (error) {
      if (error instanceof TRPCClientError && error.message === 'submission_locked') {
        toast.error(translate('withdrawLocked', locale));
      } else {
        notifyFailure(locale, 'withdrawFailed');
      }
    }
    await queryClient.invalidateQueries(trpc.hofDashboard.getHofDashboard.queryFilter({ hofId }));
  };
};
