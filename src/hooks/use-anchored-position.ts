'use client';

import { useEffect, useState, type RefObject } from 'react';

/** The gap between the element and its popup, and between the popup and the window edge. */
const GAP = 8;

/**
 * Where a popup sits next to its element, right-aligned to it: under it, or above it when the
 * window has more room there. One of `top` and `bottom` is set.
 */
export interface AnchoredPosition {
  top?: number;
  bottom?: number;
  right: number;
  /** The height left on that side, so a long popup scrolls instead of leaving the window. */
  maxHeight: number;
}

/** Below this, a popup under its element would have to scroll, so it opens where there is more. */
const ENOUGH_BELOW = 480;

const measure = (anchor: HTMLElement): AnchoredPosition => {
  const box = anchor.getBoundingClientRect();
  const right = Math.max(GAP, globalThis.innerWidth - box.right);
  const below = globalThis.innerHeight - box.bottom - 2 * GAP;
  const above = box.top - 2 * GAP;
  if (below >= ENOUGH_BELOW || below >= above) {
    return { top: box.bottom + GAP, right, maxHeight: Math.max(160, below) };
  }
  return { bottom: globalThis.innerHeight - box.top + GAP, right, maxHeight: above };
};

/**
 * Where a popup opened from `anchor` goes while it is open: under the element, or above it when
 * there is more room, its right edge on the element's. Follows the element when the page
 * scrolls or the window resizes.
 */
export const useAnchoredPosition = (
  anchor: RefObject<HTMLElement | null> | undefined,
  open: boolean,
): AnchoredPosition | undefined => {
  const [position, setPosition] = useState<AnchoredPosition>();

  useEffect(() => {
    const element = anchor?.current;
    if (!open || element === null || element === undefined) return;
    const update = (): void => setPosition(measure(element));
    update();
    globalThis.addEventListener('resize', update);
    // capture, so a scroll inside any container moves the popup along too
    globalThis.addEventListener('scroll', update, true);
    return (): void => {
      globalThis.removeEventListener('resize', update);
      globalThis.removeEventListener('scroll', update, true);
    };
  }, [anchor, open]);

  return open ? position : undefined;
};
