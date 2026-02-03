'use client';

import { environmentVariables } from '@/config/environment-variables';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { PostHogProvider as ReactPostHogProvider, usePostHog } from 'posthog-js/react';
import type React from 'react';
import { Suspense, useEffect } from 'react';

const PostHogPageView: React.FC = () => {
  const pathname = usePathname();
  const searchParameters = useSearchParams();
  const _posthog = usePostHog();

  useEffect(() => {
    if (pathname !== '') {
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
      if (data.type === 'CAPTURE_POSTHOG_EVENT' && data.payload) {
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
  useEffect(() => {
    if (
      typeof globalThis !== 'undefined' &&
      typeof globalThis !== 'undefined' &&
      environmentVariables.NEXT_PUBLIC_POSTHOG_KEY !== '' &&
      environmentVariables.NEXT_PUBLIC_POSTHOG_HOST !== ''
    ) {
      posthog.init(environmentVariables.NEXT_PUBLIC_POSTHOG_KEY ?? '', {
        api_host: '/ingest',
        ui_host: 'https://eu.posthog.com',
        person_profiles: 'identified_only',
        capture_pageview: false, // page views are captured manually
        capture_pageleave: true,
      });
    }
  }, []);

  return (
    <ReactPostHogProvider client={posthog}>
      <SuspendedPostHogPageView />
      {children}
    </ReactPostHogProvider>
  );
};
