'use client'; // Error boundaries must be Client Components

import type React from 'react';
import { useEffect } from 'react';

import '@/app/globals.scss';
import { ConveniatLogo } from '@/components/svg-logos/conveniat-logo';

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
    console.error('Something went terribly wrong, we are sorry for that.');

    const initializePostHogAndCaptureError = async (): Promise<void> => {
      try {
        const posthogModule = await import('posthog-js');
        const { initPostHog } = await import('@/lib/posthog-client');

        // Initialize PostHog with the default export
        initPostHog(posthogModule.default);
        posthogModule.default.captureException(error, {
          properties: {
            digest: error.digest,
            message: error.message,
            stack: error.stack,
          },
        });
      } catch (error_: unknown) {
        console.error('Failed to initialize PostHog or capture error:', error_);
      }
    };

    void initializePostHogAndCaptureError();
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex h-dvh w-dvw flex-col items-center justify-center p-8">
          <ConveniatLogo />

          <h1 className="text-conveniat-green pt-8 text-4xl font-bold md:pt-20">
            Es ist ein Fehler aufgetreten!
          </h1>
          <p className="mt-4 text-lg">
            Es tut uns leid, aber es ist ein Fehler aufgetreten. Bitte versuche es erneut.
          </p>
          <button
            className="mt-8 rounded bg-blue-600 px-4 py-2 text-white"
            onClick={() => globalThis.location.reload()}
          >
            Nochmals versuchen
          </button>
        </div>
      </body>
    </html>
  );
};

export default GlobalError;
