'use client'; // Error boundaries must be Client Components

import { initPostHog } from '@/lib/posthog-client';
import posthog from 'posthog-js';
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

    // make sure to report the error to posthog
    initPostHog(posthog); // here we need re-initialize posthog, as we are out of the app context
    posthog.captureException(error, {
      properties: {
        digest: error.digest,
        message: error.message,
        stack: error.stack,
      },
    });
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center h-dvh w-dvw p-8">
          <ConveniatLogo />

          <h1 className="text-4xl font-bold  text-conveniat-green md:pt-20">
            Es ist ein Fehler aufgetreten!
          </h1>
          <p className="mt-4 text-lg">
            Es tut uns leid, aber es ist ein Fehler aufgetreten. Bitte versuche es erneut.
          </p>
          <button
            className="mt-8 px-4 py-2 bg-blue-600 text-white rounded"
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
