'use client';

import type { HofDashboardArea } from '@/features/hof-dashboard/constants';
import { translate } from '@/features/hof-dashboard/texts';
import { notifyFailure } from '@/features/hof-dashboard/utils/notify-failure';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { useState } from 'react';
import { toast } from 'sonner';

/**
 * Accepts everything that counts of one Hof in the given areas, one area after the other, then
 * reloads the overview and the Hof's dashboard, which both show it.
 */
export const useAcceptHofArea = (
  locale: Locale,
): {
  accept: (hofId: string, areas: readonly HofDashboardArea[]) => Promise<void>;
  /** The Hof being accepted right now, if any. */
  pendingHofId: string | undefined;
} => {
  const utils = trpc.useUtils();
  // fail right away without signal instead of waiting paused for it, so the user hears of it
  const mutation = trpc.hofDashboard.acceptHofArea.useMutation({ networkMode: 'always' });
  const [pendingHofId, setPendingHofId] = useState<string>();

  const accept = async (hofId: string, areas: readonly HofDashboardArea[]): Promise<void> => {
    setPendingHofId(hofId);
    let accepted = 0;
    try {
      for (const area of areas) accepted += await mutation.mutateAsync({ hofId, area });
      toast.success(translate('acceptAreaDone', locale, { n: accepted }));
    } catch {
      notifyFailure(locale, 'acceptAreaFailed');
    } finally {
      setPendingHofId(undefined);
    }
    await Promise.all([
      utils.hofDashboard.getHofOverview.invalidate(),
      utils.hofDashboard.getHofDashboard.invalidate({ hofId }),
    ]);
  };
  return { accept, pendingHofId };
};
