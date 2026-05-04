'use client';

import { environmentVariables } from '@/config/environment-variables';
import { PostHogContext, usePostHog } from '@/providers/posthog-context';
import { filterPostHogNoise } from '@/utils/posthog-filters';
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
    <Suspense>
      <PostHogPageView />
    </Suspense>
  );
};

export const PostHogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [client, setClient] = useState<PostHog | undefined>();

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
      if (
        message !== '' &&
        (message.includes('blocked a frame with origin') ||
          message === 'network error' ||
          message.includes('failed to fetch')) &&
        (errorEvent.filename.includes('posthog') || errorEvent.filename === '')
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

    const isConfigured =
      typeof globalThis !== 'undefined' &&
      environmentVariables.NEXT_PUBLIC_POSTHOG_KEY !== undefined &&
      environmentVariables.NEXT_PUBLIC_POSTHOG_KEY !== '' &&
      environmentVariables.NEXT_PUBLIC_POSTHOG_HOST !== '' &&
      // Disable PostHog inside the Live Preview iframe. Rapid 'Ctrl+S' saves trigger heavy
      // Next.js RSC fetches and iframe reloads. If PostHog fires events during this, the
      // '/ingest' proxy connections stall and exhaust the browser's 6-connection pool limit,
      // breaking the iframe entirely. The parent Admin panel (`/admin`) is still tracked.
      !(
        globalThis.self !== globalThis.top &&
        (globalThis.location.search.includes('preview=true') ||
          globalThis.location.pathname.includes('/preview-fallback'))
      );

    if (isConfigured) {
      void import('posthog-js').then((module_) => {
        const posthog = module_.default;
        posthog.init(environmentVariables.NEXT_PUBLIC_POSTHOG_KEY ?? '', {
          api_host: '/ingest',
          ui_host: 'https://eu.posthog.com',
          person_profiles: 'identified_only',
          capture_pageview: false, // page views are captured manually
          capture_pageleave: true,
          // filter out known noise like CefSharp bot errors (e.g., from Outlook Safe Links)
          // see: https://github.com/cevi/conveniat-webpage/issues/1013
          before_send: filterPostHogNoise,
          // Silently handle PostHog network errors so they never bubble up
          on_request_error: (error: unknown) => {
            console.debug('[PostHog] Request failed silently:', error);
          },
        });
        setClient(posthog);
      });
    }

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
