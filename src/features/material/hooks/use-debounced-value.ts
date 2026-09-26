'use client';

import { useEffect, useState } from 'react';

/** `value`, but only once it stopped changing for `delayMs`, so typing does not query per key. */
export const useDebouncedValue = <T>(value: T, delayMs: number): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return (): void => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
};
