'use client';

import { isUnenrollmentClosed } from '@/features/schedule/utils/unenrollment-deadline';
import { useEffect, useState } from 'react';

/** the largest delay `setTimeout` can hold without wrapping around, ~24.9 days */
const MAX_TIMEOUT_DELAY = 2_147_483_647;

/**
 * Whether a shift's withdrawal window has already closed, kept honest while the card stays open.
 *
 * The answer is derived from the deadline instead of being read off the server, because the shift
 * status is cached for minutes and persisted across restarts - a flag computed when it was fetched
 * would still say "you may leave" well after the window shut.
 *
 * The comparison happens during render, against the last instant this hook looked at the clock. A
 * timer moves that instant forward exactly when the deadline passes, so a card left open across
 * the deadline closes itself instead of waiting for the next refetch to correct it.
 */
export const useIsUnenrollmentClosed = (deadline: string | null | undefined): boolean => {
  const [checkedAt, setCheckedAt] = useState(() => new Date());

  useEffect(() => {
    if (deadline == undefined) return;

    const remaining = Date.parse(deadline) - Date.now();
    // a deadline already behind us needs no timer - the render below sees it - and one further out
    // than a timer can express is re-evaluated the next time the card mounts anyway
    if (Number.isNaN(remaining) || remaining <= 0 || remaining > MAX_TIMEOUT_DELAY) return;

    const timer = setTimeout(() => setCheckedAt(new Date()), remaining);
    return (): void => clearTimeout(timer);
  }, [deadline]);

  return isUnenrollmentClosed(deadline, checkedAt);
};
