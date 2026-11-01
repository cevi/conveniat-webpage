'use client';

import { scrollBehavior } from '@/features/hof-dashboard/utils/scroll-behavior';
import { useEffect, type RefObject } from 'react';

/** Whether the top of an element is in the upper half of the screen, where it is read first. */
const topInView = (element: HTMLElement): boolean => {
  const { top } = element.getBoundingClientRect();
  return top >= 0 && top < globalThis.innerHeight / 2;
};

/**
 * Brings a form's detail into view once its tab has rendered, for the rows of the overview and
 * the list of an area, and moves the focus there so a keyboard or screen reader follows. Beside
 * the list on a wide screen it is in view already, and the page stays where it is. The detail
 * is looked up within this dashboard, since a page could hold two. Then the target is
 * forgotten, so a later render does not jump again.
 */
export const useScrollToForm = (
  container: RefObject<HTMLElement | null>,
  target: string | undefined,
  clearTarget: () => void,
): void => {
  useEffect(() => {
    if (target === undefined) return;
    // the tab shows its panel in a render of its own, so the card is visible a frame later
    const frame = requestAnimationFrame(() => {
      const card = container.current?.querySelector<HTMLElement>(
        `[data-form="${CSS.escape(target)}"]`,
      );
      if (card !== null && card !== undefined && !topInView(card)) {
        card.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
      }
      card?.focus({ preventScroll: true });
      clearTarget();
    });
    return (): void => cancelAnimationFrame(frame);
  }, [container, target, clearTarget]);
};
