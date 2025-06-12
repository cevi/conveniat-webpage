'use client';

import { initPostHog } from '@/lib/posthog-client';
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

  return <></>;
};

const SuspendedPostHogPageView: React.FC = () => {
  return (
    <Suspense fallback={<></>}>
      <PostHogPageView />
    </Suspense>
  );
};

export const PostHogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    initPostHog(posthog);
  }, []);

  return (
    <ReactPostHogProvider client={posthog}>
      <SuspendedPostHogPageView />
      {children}
    </ReactPostHogProvider>
  );
};
