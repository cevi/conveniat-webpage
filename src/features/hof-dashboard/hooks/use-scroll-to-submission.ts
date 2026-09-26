'use client';

import type { HofSubmissionType } from '@/features/hof-dashboard/constants';
import { useEffect } from 'react';

/**
 * Scrolls a submission's card into view once its tab has rendered, for the "Open" buttons of the
 * overview, and then forgets the target so a later render does not scroll again.
 */
export const useScrollToSubmission = (
  target: HofSubmissionType | undefined,
  clearTarget: () => void,
): void => {
  useEffect(() => {
    if (target === undefined) return;
    document
      .querySelector(`#submission-${target}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    clearTarget();
  }, [target, clearTarget]);
};
