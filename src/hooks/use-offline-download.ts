'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
// eslint-disable-next-line import/no-restricted-paths
import { CACHE_NAMES } from '@/features/service-worker/constants';
import { useServiceWorkerMessage } from '@/hooks/use-service-worker-message';
import { useServiceWorkerStatus } from '@/hooks/use-service-worker-status';
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

  // Handle messages using the new hook
  useServiceWorkerMessage<{ total: number; current: number }>(
    ServiceWorkerMessages.OFFLINE_DOWNLOAD_PROGRESS,
    (payload) => setProgress(payload),
  );

  useServiceWorkerMessage(ServiceWorkerMessages.OFFLINE_DOWNLOAD_COMPLETE, () => {
    setStatus('success');
    onSuccessReference.current?.();
  });

  useServiceWorkerMessage<{ ready: boolean }>(
    ServiceWorkerMessages.CHECK_OFFLINE_READY,
    (payload) => {
      if (payload.ready) {
        setStatus('has-content');
        onSuccessReference.current?.();
      } else {
        setStatus('idle');
      }
    },
  );

  // Use shared hook for readiness check
  const { isReady: swReady, error: swError } = useServiceWorkerStatus(2000);

  // Sync shared hook state to local status
  useEffect(() => {
    if (!checkSwReadyOnMount || status !== 'checking') return;

    if (swError) {
      setStatus('sw-error');
      return;
    }

    if (swReady && navigator.serviceWorker.controller) {
      // Send check message
      navigator.serviceWorker.controller.postMessage({
        type: ServiceWorkerMessages.CHECK_OFFLINE_READY,
      });

      // Fallback safety: If SW doesn't answer fast enough, show UI
      const timer = setTimeout(() => {
        setStatus((previous) => (previous === 'checking' ? 'sw-error' : previous));
      }, 1000);

      return (): void => {
        clearTimeout(timer);
      };
    } else if (swReady && !navigator.serviceWorker.controller) {
      // Ready but no controller -> claims issue or hard refresh needed
      setStatus('sw-error');
    }
    return;
  }, [checkSwReadyOnMount, status, swReady, swError]);

  const startDownload = useCallback((): void => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      setStatus('downloading');
      navigator.serviceWorker.controller.postMessage({
        type: ServiceWorkerMessages.START_OFFLINE_DOWNLOAD,
      });
    } else {
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
      try {
        await caches.delete(name);
      } catch (error) {
        console.warn(`Failed to delete cache ${name}`, error);
      }
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
