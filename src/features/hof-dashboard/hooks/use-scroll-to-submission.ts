'use client';

import type { HofSubmissionType } from '@/features/hof-dashboard/constants';
import { useEffect } from 'react';

/**
 * Brings a submission's card into view once its tab has rendered, for the "Open" buttons of
 * the overview, and moves the focus there so a keyboard or screen reader follows. Then it
 * forgets the target, so a later render does not jump again.
 */
export const useScrollToSubmission = (
  target: HofSubmissionType | undefined,
  clearTarget: () => void,
): void => {
  useEffect(() => {
    if (target === undefined) return;
    const card = document.querySelector<HTMLElement>(`#submission-${target}`);
    card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    card?.focus({ preventScroll: true });
    clearTarget();
  }, [target, clearTarget]);
};
