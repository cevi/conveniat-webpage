import { onlinePing } from '@/features/chat/api/online-ping';
import { useMutation } from '@tanstack/react-query';
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
  const { mutate } = useMutation({
    mutationFn: async () => onlinePing(),
    mutationKey: ['onlinePing'],
    networkMode: 'always', // we let the mutation fail if the network is offline
    retry: false, // disable retries for this mutation, no need to retry online pings
  });

  useEffect(() => {
    mutate();
    const interval = setInterval(() => mutate(), pingInterval);
    return (): void => clearInterval(interval);
  }, [pingInterval, mutate]);
};
