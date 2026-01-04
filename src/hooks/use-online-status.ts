'use client';

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
 * Hook to track online/offline status.
 * Returns true if online, false if offline.
 */
export const useOnlineStatus = (): boolean => {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
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
