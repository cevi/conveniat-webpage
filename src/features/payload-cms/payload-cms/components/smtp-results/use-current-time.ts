import { useEffect, useState } from 'react';

/**
 * The current time, known only in the browser. The server render and the first client render
 * both see 0, so anything derived from the clock cannot break hydration.
 *
 * @returns Milliseconds since the epoch, or 0 before the component has mounted.
 */
export const useCurrentTime = (): number => {
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentTimeMs(Date.now());
  }, []);
  return currentTimeMs;
};
