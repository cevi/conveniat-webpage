'use client';
import { Button } from '@/components/ui/buttons/button';
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
import { syncAllOfflineData } from '@/lib/chat-sync';
import type { Locale } from '@/types/types';
import { motion } from 'framer-motion';
import { Check, CircleAlert, CloudOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef } from 'react';

import { useTRPC } from '@/trpc/client';
import { useQueryClient } from '@tanstack/react-query';

interface OfflineContentEntrypointComponentProperties {
  callback: (accepted: boolean) => void;
  locale: Locale;
}

export const OfflineContentEntrypointComponent: React.FC<
  OfflineContentEntrypointComponentProperties
> = ({ callback, locale }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();

  const { status, progress, startDownload } = useOfflineDownload({
    checkSwReadyOnMount: true,
    onSuccess: () => callback(true),
    dataSyncFn: () => syncAllOfflineData({ trpc, queryClient }),
  });

  // Prefetch main destinations while user decides on offline download.
  //
  // Guarded so each path is fetched once per mount: `router.prefetch()` can change the `router`
  // identity this effect depends on, and with `staleTimes.dynamic` at 0 a repeat call always hits
  // the network instead of the prefetch cache, so an unguarded effect re-issues the same `?_rsc=`
  // request for as long as this step stays on screen. See the matching guard in use-onboarding.
  const prefetchedReference = useRef(false);
  useEffect(() => {
    if (prefetchedReference.current) return;
    prefetchedReference.current = true;
    try {
      router.prefetch('/app/dashboard');
      router.prefetch('/app/chat');
    } catch {
      // ignore
    }
  }, [router]);

  const handleDownload = (): void => {
    startDownload();
  };

  const handleNotNow = (): void => {
    callback(false);
  };

  return (
    <>
      <div className="mb-8 flex flex-col items-center gap-4">
        <div className="space-y-2 text-center">
          <h2 className="font-heading text-heading text-[17px] leading-snug font-bold">
            {offlineContentTitle[locale]}
          </h2>
          <p className="text-[15px] leading-normal text-balance text-green-700">
            {offlineContentDescription[locale]}
          </p>
        </div>
      </div>

      <div className="w-full space-y-4">
        {status === 'checking' && (
          <div className="flex flex-col items-center justify-center py-4">
            <motion.div
              className="border-t-conveniat-green h-10 w-10 rounded-full border-4 border-green-200"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        )}

        {status === 'idle' && (
          <div className="flex flex-col gap-3">
            <Button variant="primary" size="touch" className="w-full" onClick={handleDownload}>
              {offlineContentDownloadButton[locale]}
            </Button>
            <Button
              variant="plain"
              size="touch"
              className="w-full text-green-500"
              onClick={handleNotNow}
            >
              {offlineContentNotNowButton[locale]}
            </Button>
          </div>
        )}

        {status === 'downloading' && (
          <div className="w-full space-y-2">
            <div className="text-center text-[15px] font-medium text-green-700">
              {offlineContentDownloading[locale]} (
              {progress.total > 0
                ? Math.min(100, Math.round((progress.current / progress.total) * 100))
                : 0}
              %)
            </div>
            <div className="bg-tint h-2 w-full overflow-hidden rounded-full">
              <motion.div
                className="bg-conveniat-green relative h-full overflow-hidden"
                initial={{ width: 0 }}
                animate={{
                  width: `${progress.total > 0 ? Math.min(100, (progress.current / progress.total) * 100) : 0}%`,
                }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
              </motion.div>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-tint flex items-start gap-2.5 rounded-xl p-3 text-left text-[15px] leading-normal text-green-700">
            <Check className="text-conveniat-green mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{offlineContentSuccess[locale]}</span>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-danger-soft text-danger-text flex items-start gap-2.5 rounded-xl p-3 text-left text-[15px] leading-normal">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{offlineContentError[locale]}</span>
          </div>
        )}

        {status === 'sw-error' && (
          <div className="flex flex-col gap-3">
            <div className="bg-quiet flex items-start gap-2.5 rounded-xl p-3 text-left text-[15px] leading-normal text-green-700">
              <CloudOff
                className="text-conveniat-green mt-0.5 h-5 w-5 shrink-0"
                aria-hidden="true"
              />
              <span>{offlineContentServiceWorkerError[locale]}</span>
            </div>
            <Button variant="primary" size="touch" className="w-full" onClick={handleNotNow}>
              {offlineContentNotNowButton[locale]}
            </Button>
          </div>
        )}
      </div>
    </>
  );
};
