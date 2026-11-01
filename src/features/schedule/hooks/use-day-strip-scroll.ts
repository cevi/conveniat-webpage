import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The strip of days in the date carousel is a plain horizontal scroller, so a finger moves it
 * one to one and the days it brings in are already there. This hook keeps the arrows and the
 * selected day in step with it:
 *
 * - `scrollByDays` moves the strip by whole days, for the arrows;
 * - `canScrollBack` and `canScrollForward` say whether there is anything left to scroll to;
 * - whenever the selected day changes, from the strip, the day content or the URL, or the days
 *   arrive, the strip scrolls just far enough to show it. The first time without animation, so a page opened on
 *   1 August does not slide there from 24 July.
 */
export const useDayStripScroll = (
  selectedKey: string,
  dayCount: number,
): {
  stripReference: React.RefObject<HTMLDivElement | null>;
  canScrollBack: boolean;
  canScrollForward: boolean;
  onScroll: () => void;
  scrollByDays: (days: number) => void;
} => {
  const stripReference = useRef<HTMLDivElement>(null);
  const hasScrolledOnce = useRef(false);
  const [edges, setEdges] = useState({ canScrollBack: false, canScrollForward: false });

  const onScroll = useCallback((): void => {
    const strip = stripReference.current;
    if (strip === null) return;
    // a pixel of slack: snapping can stop half a pixel short of either end
    const canScrollBack = strip.scrollLeft > 1;
    const canScrollForward = strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 1;
    setEdges((previous) =>
      previous.canScrollBack === canScrollBack && previous.canScrollForward === canScrollForward
        ? previous
        : { canScrollBack, canScrollForward },
    );
  }, []);

  const scrollByDays = useCallback((days: number): void => {
    const strip = stripReference.current;
    const day = strip?.firstElementChild;
    if (strip === null || !(day instanceof HTMLElement)) return;
    const gap = Number.parseFloat(getComputedStyle(strip).columnGap) || 0;
    strip.scrollBy({ left: days * (day.offsetWidth + gap), behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const strip = stripReference.current;
    const selected = strip?.querySelector<HTMLElement>('[aria-current="date"]');
    if (strip === null || selected === null || selected === undefined) return;

    // the strip's padding, the room for a day's focus ring, stays in sight with the day
    const padding = Number.parseFloat(getComputedStyle(strip).paddingLeft) || 0;
    const start = selected.offsetLeft - padding;
    const end = selected.offsetLeft + selected.offsetWidth + padding;
    let left: number | undefined;
    if (start < strip.scrollLeft) left = start;
    else if (end > strip.scrollLeft + strip.clientWidth) left = end - strip.clientWidth;

    if (left !== undefined) {
      strip.scrollTo({ left, behavior: hasScrolledOnce.current ? 'smooth' : 'instant' });
    }
    hasScrolledOnce.current = true;
    onScroll();
  }, [selectedKey, dayCount, onScroll]);

  return { stripReference, ...edges, onScroll, scrollByDays };
};
