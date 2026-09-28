'use client';

import type { HofDashboardArea } from '@/features/hof-dashboard/constants';
import { translate } from '@/features/hof-dashboard/texts';
import { notifyFailure } from '@/features/hof-dashboard/utils/notify-failure';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { toast } from 'sonner';

/**
 * Accepts everything that counts of one Hof in one area, then reloads the overview and the
 * Hof's dashboard, which both show it.
 */
export const useAcceptHofArea = (
  locale: Locale,
): {
  accept: (hofId: string, area: HofDashboardArea) => Promise<void>;
  /** The Hof and area being accepted right now, if any. */
  pending: { hofId: string; area: HofDashboardArea } | undefined;
} => {
  const utils = trpc.useUtils();
  // fail right away without signal instead of waiting paused for it, so the user hears of it
  const mutation = trpc.hofDashboard.acceptHofArea.useMutation({ networkMode: 'always' });

  const accept = async (hofId: string, area: HofDashboardArea): Promise<void> => {
    try {
      const accepted = await mutation.mutateAsync({ hofId, area });
      toast.success(translate('acceptAreaDone', locale, { n: accepted }));
    } catch {
      notifyFailure(locale, 'acceptAreaFailed');
    }
    await Promise.all([
      utils.hofDashboard.getHofOverview.invalidate(),
      utils.hofDashboard.getHofDashboard.invalidate({ hofId }),
    ]);
  };
  return { accept, pending: mutation.isPending ? mutation.variables : undefined };
};
