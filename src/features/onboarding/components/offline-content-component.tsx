'use client';

import {
  offlineContentDescription,
  offlineContentDownloadButton,
  offlineContentDownloading,
  offlineContentError,
  offlineContentNotNowButton,
  offlineContentSuccess,
  offlineContentTitle,
} from '@/features/onboarding/onboarding-constants';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { ServiceWorkerMessages } from '@/utils/service-worker-messages';
import { motion } from 'framer-motion';
import React from 'react';

interface OfflineContentEntrypointComponentProperties {
  callback: (accepted: boolean) => void;
  locale: Locale;
}

export const OfflineContentEntrypointComponent: React.FC<
  OfflineContentEntrypointComponentProperties
> = ({ callback, locale }) => {
  const [status, setStatus] = React.useState<
    'idle' | 'checking' | 'downloading' | 'success' | 'error'
  >('checking');
  const [progress, setProgress] = React.useState({ total: 0, current: 0 });

  React.useEffect(() => {
    // 1) Set up message listener for download progress OR check response
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
          setTimeout(() => {
            callback(true);
          }, 1500); // Wait a bit before proceeding

          break;
        }
        case ServiceWorkerMessages.CHECK_OFFLINE_READY: {
          if (data.payload.ready) {
            // Previously downloaded -> Skip immediately
            callback(true);
          } else {
            // Not downloaded -> Ask user
            setStatus('idle');
          }

          break;
        }
        // No default
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    // 2) If we are in 'checking' state, ask SW if we are ready
    if (status === 'checking') {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // Send check message
        navigator.serviceWorker.controller.postMessage({
          type: ServiceWorkerMessages.CHECK_OFFLINE_READY,
        });

        // Fallback safety: If SW doesn't answer fast enough (e.g. 500ms),
        // show the UI so the user isn't stuck on a blank screen forever.
        const timer = setTimeout(() => {
          setStatus((previous) => (previous === 'checking' ? 'idle' : previous));
        }, 500);

        return (): void => {
          clearTimeout(timer);
          navigator.serviceWorker.removeEventListener('message', handleMessage);
        };
      } else {
        // No SW controller? Just show UI
        setStatus('idle');
      }
    }

    return (): void => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [status, callback]);

  const trpcUtils = trpc.useUtils();

  const handleDownload = (): void => {
    // Prefetch emergency alert settings for offline usage
    void trpcUtils.emergency.getAlertSettings.ensureData().catch(console.warn);

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      setStatus('downloading');
      navigator.serviceWorker.controller.postMessage({
        type: ServiceWorkerMessages.START_OFFLINE_DOWNLOAD,
      });
    } else {
      // Fallback if SW not ready? Just proceed.
      console.warn('Service Worker not ready, skipping download');
      callback(false);
    }
  };

  const handleNotNow = (): void => {
    callback(false);
  };

  return (
    <>
      <div className="mb-8 flex flex-col items-center gap-4">
        <div className="space-y-2 text-center">
          <h2 className="text-xl font-bold text-gray-800">{offlineContentTitle[locale]}</h2>
          <p className="text-lg text-balance text-gray-700">{offlineContentDescription[locale]}</p>
        </div>
      </div>

      <div className="w-full space-y-4">
        {status === 'checking' && (
          <div className="flex flex-col items-center justify-center py-4">
            <motion.div
              className="h-10 w-10 rounded-full border-4 border-red-200 border-t-red-600"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        )}

        {status === 'idle' && (
          <div className="flex flex-col gap-3">
            <button
              onClick={handleDownload}
              className="font-heading w-full transform cursor-pointer rounded-[8px] bg-red-700 px-8 py-3 text-center text-lg leading-normal font-bold text-red-100 shadow-md duration-100 hover:scale-[1.02] hover:bg-red-800 active:scale-[0.98]"
            >
              {offlineContentDownloadButton[locale]}
            </button>
            <button
              onClick={handleNotNow}
              className="cursor-pointer font-semibold text-gray-400 hover:text-gray-600"
            >
              {offlineContentNotNowButton[locale]}
            </button>
          </div>
        )}

        {status === 'downloading' && (
          <div className="w-full space-y-2">
            <div className="text-center text-sm font-medium text-red-700">
              {offlineContentDownloading[locale]} ({progress.current}/{progress.total})
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-red-100">
              <motion.div
                className="h-full bg-red-700"
                initial={{ width: 0 }}
                animate={{
                  width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-green-50 p-3 text-green-700">
            <span className="font-semibold">{offlineContentSuccess[locale]}</span>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-red-50 p-3 text-red-700">
            <span className="font-semibold">{offlineContentError[locale]}</span>
          </div>
        )}
      </div>
    </>
  );
};
