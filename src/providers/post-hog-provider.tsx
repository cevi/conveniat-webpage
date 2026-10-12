'use client';

import { useAnalyticsConsent } from '@/hooks/use-analytics-consent';
import { loadPostHog, stopPostHog } from '@/lib/posthog-client';
import { PostHogContext, usePostHog } from '@/providers/posthog-context';
import { usePathname, useSearchParams } from 'next/navigation';
import type { PostHog } from 'posthog-js';
import type React from 'react';
import { Suspense, useEffect, useState } from 'react';

const PostHogPageView: React.FC = () => {
  const pathname = usePathname();
  const searchParameters = useSearchParams();
  const _posthog = usePostHog();

  useEffect(() => {
    if (pathname !== '' && _posthog) {
      let url = globalThis.origin + pathname;
      const search = searchParameters.toString();
      if (search !== '') {
        url += '?' + search;
      }
      _posthog.capture('$pageview', { $current_url: url });
    }
  }, [pathname, searchParameters, _posthog]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent): void => {
      const data = event.data as {
        type?: string;
        payload?: { event: string; properties?: Record<string, unknown> };
      };
      if (data.type === 'CAPTURE_POSTHOG_EVENT' && data.payload && _posthog) {
        _posthog.capture(data.payload.event, data.payload.properties);
      }
    };

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
      return (): void => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
    return;
  }, [_posthog]);

  return <></>;
};

const SuspendedPostHogPageView: React.FC = () => {
  return (
    <Suspense fallback={<></>}>
      <PostHogPageView />
    </Suspense>
  );
};

/**
 * Hands out the PostHog client while the person consents to analytics, and stops PostHog again
 * when they withdraw.
 */
const usePostHogClient = (): PostHog | undefined => {
  const consent = useAnalyticsConsent();
  const [client, setClient] = useState<PostHog | undefined>();

  useEffect(() => {
    if (consent !== 'granted') {
      void stopPostHog();
      return;
    }

    let cancelled = false;
    void loadPostHog().then((posthog) => {
      if (!cancelled) setClient(posthog);
    });
    return (): void => {
      cancelled = true;
    };
  }, [consent]);

  return consent === 'granted' ? client : undefined;
};

export const PostHogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const client = usePostHogClient();

  useEffect(() => {
    // Suppress ResizeObserver loop errors (often caused by browser extensions)
    const handleError = (errorEvent: ErrorEvent): void => {
      const message =
        typeof errorEvent.message === 'string' ? errorEvent.message.toLowerCase() : '';

      if (
        message === 'resizeobserver loop completed with undelivered notifications.' ||
        message === 'resizeobserver loop limit exceeded'
      ) {
        const resizeObserverErrorDiv = document.querySelector(
          '#webpack-dev-server-client-overlay-div',
        );
        const resizeObserverError = document.querySelector('#webpack-dev-server-client-overlay');
        if (resizeObserverError) {
          resizeObserverError.setAttribute('style', 'display: none');
        }
        if (resizeObserverErrorDiv) {
          resizeObserverErrorDiv.setAttribute('style', 'display: none');
        }
        errorEvent.stopImmediatePropagation();
        errorEvent.preventDefault();
      }

      // Silent fail Payload Live Preview iframe cross-origin disconnects (noise during rapid save)
      // and generic background telemetry network errors from PostHog.
      const isPostHogIframeError = message.includes('bufferbelongstoiframe');

      if (
        message !== '' &&
        (message.includes('blocked a frame with origin') ||
          message === 'network error' ||
          message.includes('failed to fetch') ||
          isPostHogIframeError) &&
        (errorEvent.filename.includes('posthog') ||
          errorEvent.filename === '' ||
          isPostHogIframeError)
      ) {
        errorEvent.stopImmediatePropagation();
        errorEvent.preventDefault();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
      const reason = typeof event.reason === 'string' ? event.reason.toLowerCase() : '';
      const errorMessage = event.reason instanceof Error ? event.reason.message.toLowerCase() : '';
      const stack = event.reason instanceof Error ? (event.reason.stack ?? '').toLowerCase() : '';

      const isNetworkNoise =
        reason.includes('network error') ||
        reason.includes('failed to fetch') ||
        errorMessage.includes('network error') ||
        errorMessage.includes('failed to fetch');

      // Only suppress if the rejection originates from PostHog internals
      const isFromPostHog = stack.includes('posthog');

      if (isNetworkNoise && isFromPostHog) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    };

    globalThis.addEventListener('error', handleError, { capture: true });
    globalThis.addEventListener('unhandledrejection', handleUnhandledRejection, { capture: true });

    return (): void => {
      globalThis.removeEventListener('error', handleError, { capture: true });
      globalThis.removeEventListener('unhandledrejection', handleUnhandledRejection, {
        capture: true,
      });
    };
  }, []);

  return (
    <PostHogContext.Provider value={client}>
      <SuspendedPostHogPageView />
      {children}
    </PostHogContext.Provider>
  );
};
