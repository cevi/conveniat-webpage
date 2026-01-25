'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import type { PostHog } from 'posthog-js';
import { PostHogProvider as ReactPostHogProvider, usePostHog } from 'posthog-js/react';
import type React from 'react';
import { Suspense, useEffect, useState } from 'react';

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
  const [client, setClient] = useState<PostHog | undefined>();

  useEffect(() => {
    const init = async (): Promise<void> => {
      const { initPostHog } = await import('@/lib/posthog-client');
      const posthog = initPostHog();
      if (posthog) {
        setClient(posthog);
      }
    };
    void init();
  }, []);

  return (
    <>
      {client && (
        <ReactPostHogProvider client={client}>
          <SuspendedPostHogPageView />
        </ReactPostHogProvider>
      )}
      {children}
    </>
  );
};
