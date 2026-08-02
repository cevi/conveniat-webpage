'use client';

import { environmentVariables } from '@/config/environment-variables';
import { useAppMode } from '@/hooks/use-app-mode';
import { useServiceWorkerMessage } from '@/hooks/use-service-worker-message';
import { SerwistProvider } from '@/lib/serwist-client';
import { ServiceWorkerMessages } from '@/utils/service-worker-messages';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import React from 'react';

interface ServiceWorkerManagerProperties {
  children: ReactNode;
  swUrl?: string;
}

/**
 * A central component to manage Service Worker registration and App Mode detection.
 * This ensures that the SW is registered consistently across different layouts.
 */
export const ServiceWorkerManager: React.FC<ServiceWorkerManagerProperties> = ({
  children,
  swUrl = '/sw.js',
}) => {
  useAppMode();
  const router = useRouter();

  useServiceWorkerMessage<{ url?: string }>(
    ServiceWorkerMessages.PUSH_NAVIGATE,
    React.useCallback(
      (payload) => {
        if (typeof payload.url === 'string' && payload.url.trim() !== '') {
          const rawUrl = payload.url.trim();
          let targetPath = '/app/dashboard';
          if (rawUrl.startsWith('/') && !rawUrl.startsWith('//')) {
            targetPath = rawUrl;
          } else {
            try {
              const parsedUrl = new URL(rawUrl, globalThis.location.origin);
              targetPath = parsedUrl.pathname + parsedUrl.search;
            } catch {
              console.warn('[Service Worker Manager] Could not parse navigation URL:', rawUrl);
            }
          }
          console.log(
            '[Service Worker Manager] PUSH_NAVIGATE received, navigating to:',
            targetPath,
          );
          if (typeof globalThis.window !== 'undefined') {
            sessionStorage.setItem('pending_push_redirect', targetPath);
          }
          router.push(targetPath);
        }
      },
      [router],
    ),
  );

  React.useEffect(() => {
    if (
      environmentVariables.NEXT_PUBLIC_DISABLE_SERWIST &&
      typeof navigator !== 'undefined' &&
      'serviceWorker' in navigator
    ) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          let unregisteredAny = false;
          const unregisterPromises = registrations.map((registration) =>
            registration.unregister().then((success) => {
              if (success) {
                console.log(
                  '[Service Worker Manager] Unregistered active service worker:',
                  registration.scope,
                );
                unregisteredAny = true;
              }
            }),
          );
          Promise.all(unregisterPromises)
            .then(() => {
              if (unregisteredAny) {
                console.log('[Service Worker Manager] Reloading page to clear stale cache.');
                globalThis.location.reload();
              }
            })
            .catch(console.error);
        })
        .catch((error: unknown) =>
          console.error('[Service Worker Manager] Failed to unregister service workers:', error),
        );
    }
  }, []);

  if (environmentVariables.NEXT_PUBLIC_DISABLE_SERWIST) {
    return <>{children}</>;
  }

  return <SerwistProvider swUrl={swUrl}>{children}</SerwistProvider>;
};
