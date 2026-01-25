'use client'; // Error boundaries must be Client Components

import type React from 'react';
import { useEffect } from 'react';

import '@/app/globals.scss';
import { OnboardingLayout } from '@/features/onboarding/components/onboarding-layout';

/**
 * This file is responsible for converting a general runtime error page.
 *
 * If this page happens, there was an uncaught error in the root layout of the app;
 * normally this should never happen.
 *
 * @param error
 * @constructor
 */
const GlobalError: React.FC<{
  error: Error & { digest?: string };
}> = ({ error }) => {
  useEffect(() => {
    // Check if the error is likely due to being offline (e.g., failed to load a JS chunk)
    const isOfflineError =
      !navigator.onLine ||
      error.name === 'ChunkLoadError' ||
      error.message.toLowerCase().includes('failed to fetch') ||
      error.message.toLowerCase().includes('network error');

    if (isOfflineError) {
      console.log('[GlobalError] Offline error detected, redirecting to /~offline');
      globalThis.location.href = '/~offline';
      return;
    }

    console.error('Something went terribly wrong, we are sorry for that.');

    const initializePostHogAndCaptureError = async (): Promise<void> => {
      try {
        const { initPostHog } = await import('@/lib/posthog-client');
        const posthog = initPostHog();

        if (posthog) {
          posthog.captureException(error, {
            properties: {
              digest: error.digest,
              message: `Global error on init: ${error.message}`,
              stack: error.stack,
            },
          });
        }
      } catch (error_: unknown) {
        console.error('Failed to initialize PostHog or capture error:', error_);
      }
    };

    void initializePostHogAndCaptureError();
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex h-dvh w-dvw flex-col items-center justify-center bg-gray-50 p-4">
          <OnboardingLayout>
            <h1 className="text-conveniat-green mb-4 text-xl font-bold">
              Es ist ein Fehler aufgetreten!
            </h1>
            <p className="mb-8 text-balance text-gray-700">
              Es tut uns leid, aber es ist ein Fehler aufgetreten. Bitte versuche es erneut.
            </p>
            <button
              className="font-heading transform cursor-pointer rounded-[8px] bg-red-700 px-8 py-3 text-center text-lg leading-normal font-bold text-red-100 shadow-md duration-100 hover:scale-[1.02] hover:bg-red-800 active:scale-[0.98]"
              onClick={() => globalThis.location.reload()}
            >
              Nochmals versuchen
            </button>
          </OnboardingLayout>
        </div>
      </body>
    </html>
  );
};

export default GlobalError;
