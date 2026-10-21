'use client';

import { Button } from '@/components/ui/buttons/button';
import { IconTile } from '@/components/ui/icon-tile';
import {
  OnboardingNotice,
  OnboardingStepScreen,
} from '@/features/onboarding/components/onboarding-step';
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
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { motion } from 'framer-motion';
import { CircleCheck, Download, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef } from 'react';

interface OfflineContentEntrypointComponentProperties {
  callback: (accepted: boolean) => void;
  locale: Locale;
}

export const OfflineContentEntrypointComponent: React.FC<
  OfflineContentEntrypointComponentProperties
> = ({ callback, locale }) => {
  const trpcUtils = trpc.useUtils();
  const router = useRouter();

  const { status, progress, startDownload } = useOfflineDownload({
    checkSwReadyOnMount: true,
    onSuccess: () => callback(true),
    dataSyncFn: () => syncAllOfflineData(trpcUtils),
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

  const percent =
    progress.total > 0 ? Math.min(100, Math.round((progress.current / progress.total) * 100)) : 0;

  let actions: React.ReactNode;
  if (status === 'idle') {
    actions = (
      <>
        <Button variant="primary" size="touch" onClick={handleDownload}>
          {offlineContentDownloadButton[locale]}
        </Button>
        <Button variant="quiet" size="touch" onClick={handleNotNow}>
          {offlineContentNotNowButton[locale]}
        </Button>
      </>
    );
  } else if (status === 'sw-error') {
    actions = (
      <Button variant="primary" size="touch" onClick={handleNotNow}>
        {offlineContentNotNowButton[locale]}
      </Button>
    );
  }

  return (
    <OnboardingStepScreen
      visual={<IconTile icon={Download} size="lg" />}
      title={offlineContentTitle[locale]}
      description={offlineContentDescription[locale]}
      actions={actions}
    >
      {status === 'checking' && (
        <div className="flex justify-center py-1" role="status">
          <Loader2 className="text-conveniat-green h-6 w-6 animate-spin" aria-hidden="true" />
        </div>
      )}

      {status === 'downloading' && (
        <div className="flex flex-col gap-2">
          <p className="text-[15px] font-semibold text-green-900" aria-live="polite">
            {offlineContentDownloading[locale]} {percent}%
          </p>
          <div
            className="bg-chip h-2 w-full overflow-hidden rounded-full"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label={offlineContentDownloading[locale]}
          >
            <motion.div
              className="bg-conveniat-green h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {status === 'success' && (
        <div
          role="status"
          className="bg-tint border-tint-line flex items-center justify-center gap-2 rounded-[14px] border p-3 text-[15px] font-semibold text-green-900"
        >
          <CircleCheck className="text-conveniat-green h-5 w-5" aria-hidden="true" />
          {offlineContentSuccess[locale]}
        </div>
      )}

      {status === 'error' && (
        <OnboardingNotice role="alert">{offlineContentError[locale]}</OnboardingNotice>
      )}

      {status === 'sw-error' && (
        <OnboardingNotice>{offlineContentServiceWorkerError[locale]}</OnboardingNotice>
      )}
    </OnboardingStepScreen>
  );
};
