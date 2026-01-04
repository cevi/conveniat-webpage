import { trpc } from '@/trpc/client';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

/**
 *
 * useOnlinePing is a custom hook that pings the server at a specified interval
 * and set the online status of the current user.
 *
 * @param pingInterval
 */
export const useOnlinePing = (
  pingInterval: number = 10_000, // Default to 10 seconds
): void => {
  const { status } = useSession();

  const { mutate: ping } = trpc.chat.onlinePing.useMutation({
    networkMode: 'always',
    retry: false,
  });

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }

    // Immediately ping on mount
    ping({});

    // Set up the interval for continuous pings
    const interval = setInterval(() => ping({}), pingInterval);

    // Clean up the interval on unmount
    return (): void => clearInterval(interval);
  }, [pingInterval, ping, status]);
};
