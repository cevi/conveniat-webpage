'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
// eslint-disable-next-line import/no-restricted-paths
import { CACHE_NAMES } from '@/features/service-worker/constants';
import { ServiceWorkerMessages } from '@/utils/service-worker-messages';

export type OfflineDownloadStatus =
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'success'
  | 'error'
  | 'sw-error'
  | 'has-content';

export interface OfflineDownloadProgress {
  total: number;
  current: number;
}

export interface UseOfflineDownloadOptions {
  /**
   * Whether to automatically check for existing cached content on mount.
   * Useful in settings page to show "has-content" if already downloaded.
   */
  checkCacheOnMount?: boolean;
  /**
   * Whether to automatically check SW readiness on mount (for onboarding flow).
   */
  checkSwReadyOnMount?: boolean;
  /**
   * Callback when download completes successfully.
   */
  onSuccess?: () => void;
}

export interface UseOfflineDownloadResult {
  status: OfflineDownloadStatus;
  progress: OfflineDownloadProgress;
  startDownload: () => void;
  deleteContent: () => Promise<void>;
}

export const useOfflineDownload = (
  options: UseOfflineDownloadOptions = {},
): UseOfflineDownloadResult => {
  const { checkCacheOnMount = false, checkSwReadyOnMount = false, onSuccess } = options;

  const [status, setStatus] = useState<OfflineDownloadStatus>(
    checkSwReadyOnMount ? 'checking' : 'idle',
  );
  const [progress, setProgress] = useState<OfflineDownloadProgress>({ total: 0, current: 0 });

  // Use ref to avoid stale closures
  const onSuccessReference = useRef(onSuccess);
  onSuccessReference.current = onSuccess;

  // Check for existing cached content (settings page use case)
  useEffect(() => {
    if (!checkCacheOnMount) return;

    const checkCache = async (): Promise<void> => {
      try {
        const pagesCache = await caches.open(CACHE_NAMES.PAGES);
        const keys = await pagesCache.keys();
        // Arbitrary threshold to assume "downloaded"
        if (keys.length > 5) {
          setStatus('has-content');
        }
      } catch {
        // Cache API might not be available
      }
    };
    void checkCache();
  }, [checkCacheOnMount]);

  // Listen for Service Worker messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent): void => {
      const data = event.data as
        | {
            type: typeof ServiceWorkerMessages.OFFLINE_DOWNLOAD_PROGRESS;
            payload: { total: number; current: number };
          }
        | { type: typeof ServiceWorkerMessages.OFFLINE_DOWNLOAD_COMPLETE }
        | {
            type: typeof ServiceWorkerMessages.CHECK_OFFLINE_READY;
            payload: { ready: boolean };
          }
        | undefined;

      switch (data?.type) {
        case ServiceWorkerMessages.OFFLINE_DOWNLOAD_PROGRESS: {
          setProgress(data.payload);
          break;
        }
        case ServiceWorkerMessages.OFFLINE_DOWNLOAD_COMPLETE: {
          setStatus('success');
          onSuccessReference.current?.();
          break;
        }
        case ServiceWorkerMessages.CHECK_OFFLINE_READY: {
          if (data.payload.ready) {
            // Previously downloaded -> signal via has-content or success based on context
            setStatus('has-content');
            onSuccessReference.current?.();
          } else {
            // Not downloaded -> Ask user
            setStatus('idle');
          }
          break;
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    return (): void => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
    };
  }, []);

  // Check SW readiness on mount for onboarding flow
  useEffect(() => {
    if (!checkSwReadyOnMount || status !== 'checking') return;

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Send check message
      navigator.serviceWorker.controller.postMessage({
        type: ServiceWorkerMessages.CHECK_OFFLINE_READY,
      });

      // Fallback safety: If SW doesn't answer fast enough, show UI
      const timer = setTimeout(() => {
        setStatus((previous) => (previous === 'checking' ? 'idle' : previous));
      }, 500);

      return (): void => {
        clearTimeout(timer);
      };
    } else {
      // No SW controller? Just show UI
      setStatus('idle');
    }
    return;
  }, [checkSwReadyOnMount, status]);

  const startDownload = useCallback((): void => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      setStatus('downloading');
      navigator.serviceWorker.controller.postMessage({
        type: ServiceWorkerMessages.START_OFFLINE_DOWNLOAD,
      });
    } else {
      // Service Worker not ready - log to PostHog and disable feature
      console.warn('Service Worker not ready');
      setStatus('sw-error');

      // Log error to PostHog
      void import('posthog-js').then((posthogModule) => {
        posthogModule.default.capture('offline_download_sw_error', {
          error: 'Service Worker not ready',
          hasServiceWorker: 'serviceWorker' in navigator,
          hasController: 'serviceWorker' in navigator && !!navigator.serviceWorker.controller,
        });
      });
    }
  }, []);

  const deleteContent = useCallback(async (): Promise<void> => {
    const cacheNamesToDelete = [
      CACHE_NAMES.PAGES,
      CACHE_NAMES.MAP_TILES,
      CACHE_NAMES.OFFLINE_ASSETS,
      CACHE_NAMES.RSC,
    ];
    for (const name of cacheNamesToDelete) {
      await caches.delete(name);
    }
    setStatus('idle');
  }, []);

  return {
    status,
    progress,
    startDownload,
    deleteContent,
  };
};
