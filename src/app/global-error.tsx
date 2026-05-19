'use client'; // Error boundaries must be Client Components

import type React from 'react';
import { useEffect, useState } from 'react';

import '@/app/globals.scss';
import { OnboardingLayout } from '@/features/onboarding/components/onboarding-layout';
import { isDraftOrPreviewMode } from '@/utils/draft-mode';

const DRAFT_MODE_RELOAD_DELAY_MS = 2000;

/**
 * This file is responsible for converting a general runtime error page.
 *
 * If this page happens, there was an uncaught error in the root layout of the app;
 * normally this should never happen.
 *
 * In draft/preview mode (Payload CMS Live Preview), transient network errors
 * are expected when the server briefly restarts. Instead of showing an error page
 * (which permanently breaks the iframe), we auto-reload after a short delay.
 *
 * @param error
 * @constructor
 */
const GlobalError: React.FC<{
  error: Error & { digest?: string };
}> = ({ error }) => {
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    // Check if the error is likely due to being offline (e.g., failed to load a JS chunk)
    const isOfflineError =
      !navigator.onLine ||
      error.name === 'ChunkLoadError' ||
      error.message.toLowerCase().includes('failed to fetch') ||
      error.message.toLowerCase().includes('network error');

    // Completely disable global offline redirection for the Payload CMS admin panel.
    // Payload has its own offline handling and error boundaries.
    const isAdminPanel =
      typeof globalThis !== 'undefined' && globalThis.location.pathname.startsWith('/admin');

    // In draft/preview mode, auto-reload instead of showing the error page.
    // This prevents the Payload CMS Live Preview iframe from getting stuck.
    // We also do this for transient network errors in the admin panel to prevent the
    // root error boundary from permanently replacing the admin UI with a red error screen.
    const isTransientAdminError = isAdminPanel && isOfflineError;

    if (isDraftOrPreviewMode() || isTransientAdminError) {
      console.warn(
        '[GlobalError] Transient error in admin/preview mode. Auto-reloading in 2s:',
        error.message,
      );
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsRecovering(true);
      const timer = setTimeout((): void => {
        globalThis.location.reload();
      }, DRAFT_MODE_RELOAD_DELAY_MS);
      return (): void => {
        clearTimeout(timer);
      };
    }

    if (isOfflineError && !isAdminPanel) {
      console.error('[GlobalError] Network/Offline error detected:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        digest: error.digest,
        navigatorOnline: navigator.onLine,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
      console.log('[GlobalError] Redirecting to /~offline');
      globalThis.location.href = '/~offline';
      return;
    }

    console.error('Something went terribly wrong, we are sorry for that.');

    if (typeof globalThis !== 'undefined') {
      import('posthog-js')
        .then(({ default: posthog }) => {
          posthog.captureException(error);
        })
        .catch((error_: unknown) => console.error('Failed to capture error with PostHog', error_));
    }
    return;
  }, [error]);

  // In draft/preview mode, show a minimal recovery message instead of the full error page
  if (isRecovering) {
    return (
      <html>
        <body>
          <div className="flex h-dvh w-dvw flex-col items-center justify-center bg-gray-50 p-4">
            <p className="text-gray-500">Verbindung wird wiederhergestellt</p>
          </div>
        </body>
      </html>
    );
  }

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
