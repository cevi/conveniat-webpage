'use client';

import { useEffect, useRef } from 'react';

/**
 * Takes over what is stored whenever it changes, unless the user has typed something since:
 * a reviewer's correction then shows, and the form is never remounted, so the focus stays
 * where it was, on the save button after a save.
 */
export const useFollowStored = (
  revision: string | undefined,
  edited: boolean,
  takeOver: () => void,
): void => {
  const seen = useRef(revision);
  useEffect(() => {
    if (revision === seen.current) return;
    seen.current = revision;
    if (!edited) takeOver();
  }, [revision, edited, takeOver]);
};
