'use client';

import { useEffect, useState } from 'react';

/**
 * The current time, refreshed every half minute: often enough for "noch 36 min" to stay right,
 * rare enough not to matter on a cheap phone. Runs off the phone's clock, so it works offline.
 */
export const useNow = (intervalMs: number = 30_000): Date => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return (): void => clearInterval(timer);
  }, [intervalMs]);

  return now;
};
