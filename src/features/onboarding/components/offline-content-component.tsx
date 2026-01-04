'use client';

import {
  offlineContentDescription,
  offlineContentDownloadButton,
  offlineContentDownloading,
  offlineContentError,
  offlineContentNotNowButton,
  offlineContentServiceWorkerError,
  offlineContentSuccess,
  offlineContentTitle,
} from '@/features/onboarding/onboarding-constants';
import { useOfflineDownload } from '@/hooks/use-offline-download';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { motion } from 'framer-motion';
import React from 'react';

interface OfflineContentEntrypointComponentProperties {
  callback: (accepted: boolean) => void;
  locale: Locale;
}

export const OfflineContentEntrypointComponent: React.FC<
  OfflineContentEntrypointComponentProperties
> = ({ callback, locale }) => {
  const trpcUtils = trpc.useUtils();

  const { status, progress, startDownload } = useOfflineDownload({
    checkSwReadyOnMount: true,
    onSuccess: () => callback(true),
  });

  // When hook detects content is already ready, callback immediately
  React.useEffect(() => {
    if (status === 'has-content') {
      callback(true);
    }
  }, [status, callback]);

  const handleDownload = (): void => {
    // Prefetch emergency alert settings for offline usage
    void trpcUtils.emergency.getAlertSettings.ensureData().catch(console.warn);
    startDownload();
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

        {status === 'sw-error' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-center gap-2 rounded-lg bg-gray-100 p-3 text-gray-600">
              <span className="font-semibold">{offlineContentServiceWorkerError[locale]}</span>
            </div>
            <button
              onClick={handleNotNow}
              className="font-heading w-full transform cursor-pointer rounded-[8px] bg-gray-400 px-8 py-3 text-center text-lg leading-normal font-bold text-white shadow-md duration-100 hover:scale-[1.02] hover:bg-gray-500 active:scale-[0.98]"
            >
              {offlineContentNotNowButton[locale]}
            </button>
          </div>
        )}
      </div>
    </>
  );
};
