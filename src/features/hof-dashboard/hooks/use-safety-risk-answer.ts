'use client';

import type { HofSubmissionType } from '@/features/hof-dashboard/constants';
import { notifyFailure } from '@/features/hof-dashboard/utils/notify-failure';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';

/**
 * The Hof's answer to "elevated safety risk?" for one plan, and a way to change it. An answer
 * on its way shows at once, since on camp wifi the round trip takes seconds; if it fails, the
 * stored answer shows again and the user is told. Answers go one after the other, so a quick
 * correction is the one the server keeps.
 */
export const useSafetyRiskAnswer = (
  hofId: string,
  submissionType: HofSubmissionType,
  stored: 'yes' | 'no' | undefined,
  locale: Locale,
): ['yes' | 'no' | undefined, (answer: 'yes' | 'no') => void] => {
  const utils = trpc.useUtils();
  const mutation = trpc.hofDashboard.updateSafetyRisk.useMutation({
    // fail right away without signal instead of waiting paused for it
    networkMode: 'always',
    scope: { id: `hof-safety-risk-${hofId}-${submissionType}` },
    onError: () => notifyFailure(locale, 'saveFailed'),
    // awaited, so the answer stays pending until the reloaded dashboard has it
    onSettled: () => utils.hofDashboard.getHofDashboard.invalidate({ hofId }),
  });
  const shown = mutation.isPending ? mutation.variables.elevatedSafetyRisk : stored;
  return [
    shown,
    (elevatedSafetyRisk): void => mutation.mutate({ hofId, submissionType, elevatedSafetyRisk }),
  ];
};
