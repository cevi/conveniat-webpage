'use client';

import { useOffline } from 'next/offline';
import { useEffect, useState, useSyncExternalStore } from 'react';

/**
 * Subscribe to online/offline status changes.
 */
const subscribe = (callback: () => void): (() => void) => {
  globalThis.addEventListener('online', callback);
  globalThis.addEventListener('offline', callback);
  return (): void => {
    globalThis.removeEventListener('online', callback);
    globalThis.removeEventListener('offline', callback);
  };
};

const getSnapshot = (): boolean => {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
};

const getServerSnapshot = (): boolean => {
  // On the server, we assume online
  return true;
};

/**
 * Hook to track online/offline status leveraging Next.js 16.3 `useOffline` API.
 * Returns true if online, false if offline.
 */
export const useOnlineStatus = (): boolean => {
  const isNextOffline = useOffline();
  const isWindowOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return !isNextOffline && isWindowOnline;
};

/**
 * Hook to track online/offline status with additional state.
 * Useful for showing transitions and animations.
 */
export const useOnlineStatusWithState = (): {
  isOnline: boolean;
  wasOffline: boolean;
} => {
  const isOnline = useOnlineStatus();
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      void Promise.resolve().then(() => {
        setWasOffline(true);
      });
    }
  }, [isOnline]);

  return { isOnline, wasOffline };
};
