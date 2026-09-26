'use client';

import { useEffect, useState, type RefObject } from 'react';

/**
 * Whether a sideways-scrolling row has more to show to its left or right, kept current as it
 * scrolls and as its size changes, so the row can fade out where something is hidden.
 */
export const useScrollEdges = (
  element: RefObject<HTMLElement | null>,
): { start: boolean; end: boolean } => {
  const [edges, setEdges] = useState({ start: false, end: false });
  useEffect(() => {
    const row = element.current;
    if (row === null) return;
    const measure = (): void => {
      const start = row.scrollLeft > 1;
      const end = row.scrollLeft + row.clientWidth < row.scrollWidth - 1;
      setEdges((previous) =>
        previous.start === start && previous.end === end ? previous : { start, end },
      );
    };
    measure();
    row.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return (): void => {
      row.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [element]);
  return edges;
};
