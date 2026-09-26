'use client';

import { useEffect, useRef, type RefObject } from 'react';

/**
 * Puts the focus back on `target` when something that replaced it is over, like an upload
 * whose cancel button disappears with it. Only when the focus was lost with it, so a user who
 * has moved on elsewhere is left where they are.
 */
export const useRefocusWhenDone = (busy: boolean, target: RefObject<HTMLElement | null>): void => {
  const wasBusy = useRef(busy);
  useEffect(() => {
    const lostFocus = document.activeElement === null || document.activeElement === document.body;
    if (wasBusy.current && !busy && lostFocus) target.current?.focus();
    wasBusy.current = busy;
  }, [busy, target]);
};
