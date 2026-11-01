import type React from 'react';
import { useEffect, useRef } from 'react';

/**
 * Scrolls the line of "now" into the middle of the screen when today's programme opens, once per
 * day shown: later minutes move the line, but never the page under the reader's thumb.
 */
export const useScrollToNow = (
  listReference: React.RefObject<HTMLElement | null>,
  dayKey: string | undefined,
): void => {
  const scrolledFor = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (dayKey === undefined || scrolledFor.current === dayKey) return;
    const line = listReference.current?.querySelector('[data-now-line]');
    if (line === null || line === undefined) return;
    line.scrollIntoView({ block: 'center', behavior: 'instant' });
    scrolledFor.current = dayKey;
  });
};
