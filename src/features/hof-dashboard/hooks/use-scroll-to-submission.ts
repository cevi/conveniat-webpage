'use client';

import type { HofSubmissionType } from '@/features/hof-dashboard/constants';
import { useEffect, type RefObject } from 'react';

/**
 * Brings a submission's card into view once its tab has rendered, for the rows of the
 * overview, and moves the focus there so a keyboard or screen reader follows. The card is
 * looked up within this Hof's dashboard, since another Hof's may be on the page too. Then the
 * target is forgotten, so a later render does not jump again.
 */
export const useScrollToSubmission = (
  container: RefObject<HTMLElement | null>,
  target: HofSubmissionType | undefined,
  clearTarget: () => void,
): void => {
  useEffect(() => {
    if (target === undefined) return;
    const card = container.current?.querySelector<HTMLElement>(`[data-submission="${target}"]`);
    card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    card?.focus({ preventScroll: true });
    clearTarget();
  }, [container, target, clearTarget]);
};
