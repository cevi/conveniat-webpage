'use client';

import { initPostHog } from '@/lib/posthog-client';
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
      const posthogModule = await import('posthog-js');
      const posthog = posthogModule.default;
      initPostHog(posthog);
      setClient(posthog);
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
