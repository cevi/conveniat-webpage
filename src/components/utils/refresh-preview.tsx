'use client';

import { RefreshRouteOnSave as PayloadLivePreview } from '@payloadcms/live-preview-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useRef } from 'react';

export const RefreshRouteOnSave: React.FC<{
  serverURL: string;
}> = ({ serverURL }) => {
  const router = useRouter();
  const timerReference = useRef<NodeJS.Timeout | null>(null);

  const handleRefresh = useCallback(() => {
    if (timerReference.current) {
      clearTimeout(timerReference.current);
    }
    // Delay the actual refresh by 750ms to prevent overwhelming the server with RSC queries
    // and hitting Traefik/Next.js concurrent stream limit timeouts.
    timerReference.current = setTimeout(() => {
      router.refresh();
    }, 750);
  }, [router]);

  return <PayloadLivePreview refresh={handleRefresh} serverURL={serverURL} />;
};
