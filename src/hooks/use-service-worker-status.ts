'use client';

import { useEffect, useState } from 'react';

interface UseServiceWorkerStatusResult {
  isReady: boolean;
  registration: ServiceWorkerRegistration | undefined;
  error: Error | undefined;
}

export const useServiceWorkerStatus = (timeoutMs = 2000): UseServiceWorkerStatusResult => {
  const [isReady, setIsReady] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | undefined>();
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    let mounted = true;

    const checkReady = async (): Promise<void> => {
      if (!('serviceWorker' in navigator)) {
        await Promise.resolve(); // Avoid synchronous setState warning
        if (mounted) setError(new Error('Service Worker not supported'));
        return;
      }

      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('SW Ready Timeout')), timeoutMs),
        );

        const result = await Promise.race([navigator.serviceWorker.ready, timeoutPromise]);

        if (mounted) {
          setRegistration(result);
          setIsReady(true);
        }
      } catch (error_) {
        // If it was a timeout, we might still be "loading" technically, or just "not ready yet".
        // But for this hook, it signals failure to get ready in time.
        if (mounted) {
          setError(error_ instanceof Error ? error_ : new Error('Unknown SW Error'));
        }
      }
    };

    void checkReady();

    return (): void => {
      mounted = false;
    };
  }, [timeoutMs]);

  return { isReady, registration, error };
};
