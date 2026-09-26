'use client';

import type { HofSubmissionType } from '@/features/hof-dashboard/constants';
import { useEffect, type RefObject } from 'react';

/**
 * Brings a submission's card into view once its tab has rendered, for the rows of the
 * overview, and moves the focus there so a keyboard or screen reader follows. The card is
 * looked up within this dashboard, since a page could hold two. Then the target is forgotten,
 * so a later render does not jump again.
 */
export const useScrollToSubmission = (
  container: RefObject<HTMLElement | null>,
  target: HofSubmissionType | undefined,
  clearTarget: () => void,
): void => {
  useEffect(() => {
    if (target === undefined) return;
    // the tab shows its panel in a render of its own, so the card is visible a frame later
    const frame = requestAnimationFrame(() => {
      const card = container.current?.querySelector<HTMLElement>(`[data-submission="${target}"]`);
      card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      card?.focus({ preventScroll: true });
      clearTarget();
    });
    return (): void => cancelAnimationFrame(frame);
  }, [container, target, clearTarget]);
};
