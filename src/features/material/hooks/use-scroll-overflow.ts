'use client';

import type React from 'react';
import { useEffect, useState } from 'react';

export interface ScrollOverflow {
  canScrollBack: boolean;
  canScrollForward: boolean;
}

/** A pixel of rounding at either end is not "more to see". */
const EDGE_PX = 2;

/**
 * Whether a sideways-scrolling strip hides something at either end, so the strip can say so
 * with a fade and an arrow. Follows scrolling and every change of the strip's width;
 * `contentKey` changes when entries come or go.
 */
export const useScrollOverflow = (
  reference: React.RefObject<HTMLElement | null>,
  contentKey: string,
): ScrollOverflow => {
  const [overflow, setOverflow] = useState<ScrollOverflow>({
    canScrollBack: false,
    canScrollForward: false,
  });

  useEffect(() => {
    const element = reference.current;
    if (element === null) return;
    const measure = (): void => {
      const next = {
        canScrollBack: element.scrollLeft > EDGE_PX,
        canScrollForward: element.scrollLeft + element.clientWidth < element.scrollWidth - EDGE_PX,
      };
      setOverflow((previous) =>
        previous.canScrollBack === next.canScrollBack &&
        previous.canScrollForward === next.canScrollForward
          ? previous
          : next,
      );
    };
    measure();
    element.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    for (const child of element.children) observer.observe(child);
    return (): void => {
      element.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [reference, contentKey]);

  return overflow;
};

/**
 * Scrolls the strip so the active entry sits in view, centred where it can, whenever the
 * active entry changes. Only the strip moves, never the page.
 */
export const useActiveInView = (
  reference: React.RefObject<HTMLElement | null>,
  activeKey: string,
): void => {
  useEffect(() => {
    const element = reference.current;
    const active = element?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!element || !active) return;
    const left = active.offsetLeft - (element.clientWidth - active.offsetWidth) / 2;
    element.scrollTo({ left: Math.max(0, left), behavior: 'instant' });
  }, [reference, activeKey]);
};
