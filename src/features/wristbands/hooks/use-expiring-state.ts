'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A value that clears itself `ms` after it was last set, like the undo of a handed-out band.
 * Setting it again starts the time over; the timer goes with the component.
 */
export const useExpiringState = <T>(
  ms: number,
): [T | undefined, (value: T | undefined) => void] => {
  const [value, setValue] = useState<T | undefined>();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => (): void => {
      if (timer.current !== undefined) clearTimeout(timer.current);
    },
    [],
  );

  const set = useCallback(
    (next: T | undefined): void => {
      if (timer.current !== undefined) clearTimeout(timer.current);
      timer.current = next === undefined ? undefined : setTimeout(() => setValue(undefined), ms);
      setValue(next);
    },
    [ms],
  );

  return [value, set];
};
