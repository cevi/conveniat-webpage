'use client';

import { useEffect, useState } from 'react';

const elapsedSecondsSince = (startedAt: string): number =>
  Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));

/**
 * Seconds since `startedAt`, ticking once per second.
 *
 * A running job's poll only lands every two seconds, which is enough to move a progress
 * bar but makes an elapsed timer look frozen. This drives the timer on its own clock.
 * Returns `undefined` when there is nothing to time.
 */
export const useElapsedSeconds = (startedAt: string | undefined): number | undefined => {
  // Seeded from the render itself rather than from the effect, so the first paint already
  // shows the right number instead of a zero that corrects itself a tick later.
  const [tick, setTick] = useState(0);

  useEffect((): (() => void) => {
    if (startedAt === undefined) return (): void => {};

    const interval = setInterval(() => {
      setTick((previous) => previous + 1);
    }, 1000);

    return (): void => {
      clearInterval(interval);
    };
  }, [startedAt]);

  // `tick` is only here to drive the re-render; the value always comes from the clock,
  // which keeps it correct even if a timer fires late or the tab was suspended.
  void tick;

  return startedAt === undefined ? undefined : elapsedSecondsSince(startedAt);
};
