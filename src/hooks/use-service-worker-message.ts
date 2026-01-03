'use client';

import { useEffect } from 'react';

/**
 * Hook to listen for messages from the service worker.
 * @param messageType The specific message type to listen for.
 * @param callback The callback to execute when the message is received.
 */
export const useServiceWorkerMessage = <T = unknown>(
  messageType: string,
  callback: (payload: T) => void,
): void => {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent): void => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const data = event.data;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (data?.type === messageType) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        callback(data.payload as T);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return (): void => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [messageType, callback]);
};
