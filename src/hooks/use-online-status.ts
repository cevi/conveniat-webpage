'use client';

import { ServiceWorkerMessages } from '@/utils/service-worker-messages';
import { useEffect, useState, useSyncExternalStore } from 'react';

/**
 * Whether the service worker last got an answer from the network. `navigator.onLine` only
 * reports the network interface, so it stays true on wifi without a working uplink, the usual
 * case at camp; the worker notices that when its requests go unanswered and reports it here.
 */
let networkReachable = true;
let askedWorker = false;

/**
 * While the worker gets no answers, the page asks it again from time to time and whenever the
 * app returns to the foreground; the worker then tries the network. A page showing cached data
 * may otherwise send no request at all, and the banner would outlast the outage.
 */
const RECHECK_INTERVAL_MS = 10_000;
let recheckTimer: ReturnType<typeof setInterval> | undefined;

const askWorker = (): void => {
  navigator.serviceWorker.controller?.postMessage({ type: ServiceWorkerMessages.NETWORK_STATUS });
};

const askWorkerWhenVisible = (): void => {
  if (document.visibilityState === 'visible') askWorker();
};

const setNetworkReachable = (reachable: boolean): void => {
  networkReachable = reachable;
  if (!reachable && recheckTimer === undefined) {
    recheckTimer = setInterval(askWorker, RECHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', askWorkerWhenVisible);
  } else if (reachable && recheckTimer !== undefined) {
    clearInterval(recheckTimer);
    recheckTimer = undefined;
    document.removeEventListener('visibilitychange', askWorkerWhenVisible);
  }
};

const isNetworkStatusMessage = (
  data: unknown,
): data is { type: string; payload: { reachable: boolean } } => {
  if (typeof data !== 'object' || data === null) return false;
  const message = data as { type?: unknown; payload?: { reachable?: unknown } };
  return (
    message.type === ServiceWorkerMessages.NETWORK_STATUS &&
    typeof message.payload?.reachable === 'boolean'
  );
};

/**
 * Subscribe to online/offline status changes.
 */
const subscribe = (callback: () => void): (() => void) => {
  const handleMessage = (event: MessageEvent): void => {
    if (!isNetworkStatusMessage(event.data)) return;
    setNetworkReachable(event.data.payload.reachable);
    callback();
  };
  // A network that comes back is assumed to answer; the worker reports it if it does not.
  const handleOnline = (): void => {
    setNetworkReachable(true);
    callback();
  };

  globalThis.addEventListener('online', handleOnline);
  globalThis.addEventListener('offline', callback);
  const serviceWorker = typeof navigator === 'undefined' ? undefined : navigator.serviceWorker;
  serviceWorker?.addEventListener('message', handleMessage);
  // the worker may have stopped getting answers before this page started
  if (!askedWorker && serviceWorker?.controller) {
    askedWorker = true;
    askWorker();
  }

  return (): void => {
    globalThis.removeEventListener('online', handleOnline);
    globalThis.removeEventListener('offline', callback);
    serviceWorker?.removeEventListener('message', handleMessage);
  };
};

const getSnapshot = (): boolean => {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine && networkReachable;
};

const getServerSnapshot = (): boolean => {
  // On the server, we assume online
  return true;
};

/**
 * Hook to track online/offline status.
 * Returns false when the device has no network, and when it has one that does not answer.
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
