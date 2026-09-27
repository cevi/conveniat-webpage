'use client';

import { useEffect, useRef, type RefObject } from 'react';

/**
 * Keeps the keyboard focus on a spot whose control changes with `step`, like an upload whose
 * button makes way for a cancel button and back. When the focused control goes away with a
 * step, the focus moves to `target`, the control of the new step. A user who has moved on
 * elsewhere is left where they are.
 */
export const useKeepFocus = (step: string, target: RefObject<HTMLElement | null>): void => {
  const previousStep = useRef(step);
  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    const lostFocus = document.activeElement === null || document.activeElement === document.body;
    if (lostFocus) target.current?.focus();
  }, [step, target]);
};
