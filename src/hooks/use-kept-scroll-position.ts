'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Keeps the place of a list that stays mounted in a hidden `<Activity>` while a detail covers
 * it, like a material article or a block of the Programm. Hiding the list shortens the page and
 * the browser clamps the scroll to it, so the position is remembered while the list shows, the
 * detail opens at the top, and the list comes back where it was left. A layout effect, so the
 * list never shows a frame at the wrong place.
 */
export const useKeptScrollPosition = (hidden: boolean): void => {
  const saved = useRef(0);
  const tracking = useRef(!hidden);
  const previous = useRef(hidden);

  useEffect(() => {
    const remember = (): void => {
      if (tracking.current) saved.current = globalThis.scrollY;
    };
    globalThis.addEventListener('scroll', remember, { passive: true });
    return (): void => globalThis.removeEventListener('scroll', remember);
  }, []);

  useLayoutEffect(() => {
    tracking.current = !hidden;
    if (previous.current === hidden) return;
    previous.current = hidden;
    globalThis.scrollTo(0, hidden ? 0 : saved.current);
  }, [hidden]);
};
