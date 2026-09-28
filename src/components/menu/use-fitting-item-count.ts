'use client';

import type React from 'react';
import { useEffect, useState } from 'react';

/**
 * How many items of a row fit into `availableWidth`, leaving room for an overflow button when
 * not all of them do.
 *
 * @param itemRightEdges the right edge of each item, measured from the start of the row
 * @param availableWidth the width the row may take
 * @param overflowButtonWidth the width the overflow button needs, including its gap to the items
 */
export const countFittingItems = (
  itemRightEdges: number[],
  availableWidth: number,
  overflowButtonWidth: number,
): number => {
  const lastRightEdge = itemRightEdges.at(-1) ?? 0;
  if (lastRightEdge <= availableWidth) return itemRightEdges.length;

  const widthForItems = availableWidth - overflowButtonWidth;
  const fitting = itemRightEdges.findIndex((rightEdge) => rightEdge > widthForItems);
  return fitting === -1 ? itemRightEdges.length : fitting;
};

/**
 * Counts how many items of a navigation row fit into `container` (the priority+ pattern).
 *
 * The labels come from the CMS, so their width is unknown until the browser lays them out.
 * `measureRow` holds an invisible copy of every item followed by the overflow button, so the
 * items stay measurable while they are moved out of the visible row. It is re-measured when
 * the container resizes and when the row itself changes size, which is what a late web font does.
 */
export const useFittingItemCount = (
  container: React.RefObject<HTMLElement | null>,
  measureRow: React.RefObject<HTMLElement | null>,
  itemCount: number,
): number => {
  const [fittingCount, setFittingCount] = useState(itemCount);

  useEffect(() => {
    const containerElement = container.current;
    const measureRowElement = measureRow.current;
    if (containerElement === null || measureRowElement === null) return;

    const measure = (): void => {
      const children = [...measureRowElement.children] as HTMLElement[];
      const overflowButton = children.at(-1);
      const items = children.slice(0, -1);
      if (overflowButton === undefined) return;

      const itemRightEdges = items.map((item) => item.offsetLeft + item.offsetWidth);
      const overflowButtonWidth =
        overflowButton.offsetLeft + overflowButton.offsetWidth - (itemRightEdges.at(-1) ?? 0);
      setFittingCount(
        countFittingItems(itemRightEdges, containerElement.clientWidth, overflowButtonWidth),
      );
    };

    const observer = new ResizeObserver(measure);
    observer.observe(containerElement);
    observer.observe(measureRowElement);
    return (): void => observer.disconnect();
  }, [container, measureRow, itemCount]);

  return fittingCount;
};
