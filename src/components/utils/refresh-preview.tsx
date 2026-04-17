'use client';

import { RefreshRouteOnSave as PayloadLivePreview } from '@payloadcms/live-preview-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useRef } from 'react';

/**
 * Returns a debounced refresh handler that calls `router.refresh()` after the specified delay.
 * Any pending timeout is cleared when the component using this hook unmounts.
 *
 * @param delayMs - Debounce delay in milliseconds before refreshing the route.
 * @returns A debounced refresh callback.
 */
function useDebouncedRouteRefresh(delayMs: number): () => void {
  const router = useRouter();
  const timerReference = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return (): void => {
      if (timerReference.current) {
        clearTimeout(timerReference.current);
      }
    };
  }, []);

  const handleRefresh = useCallback(() => {
    if (timerReference.current) {
      clearTimeout(timerReference.current);
    }
    // Delay the actual refresh by the configured debounce duration to prevent overwhelming the server
    // with RSC queries and hitting Traefik/Next.js concurrent stream limit timeouts.
    timerReference.current = setTimeout(() => {
      router.refresh();
    }, delayMs);
  }, [router, delayMs]);

  return handleRefresh;
}

/**
 * Client component that wires Payload live preview to a debounced Next.js route refresh.
 */
export const RefreshRouteOnSave: React.FC<{
  serverURL: string;
}> = ({ serverURL }) => {
  const handleRefresh = useDebouncedRouteRefresh(2500);
  return <PayloadLivePreview refresh={handleRefresh} serverURL={serverURL} />;
};
