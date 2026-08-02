'use client';

import { environmentVariables } from '@/config/environment-variables';
import { useAppMode } from '@/hooks/use-app-mode';
import { useServiceWorkerMessage } from '@/hooks/use-service-worker-message';
import { SerwistProvider } from '@/lib/serwist-client';
import { trpc } from '@/trpc/client';
import { refreshAndOptimisticallyUpdateChat } from '@/utils/push-query-refresher';
import { ServiceWorkerMessages } from '@/utils/service-worker-messages';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import React from 'react';
import { toast } from 'sonner';

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
  const trpcUtils = trpc.useUtils();

  useServiceWorkerMessage<{ url?: string; payload?: Record<string, unknown> }>(
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

          let targetChatId: string | undefined;
          if (targetPath.includes('/app/chat/')) {
            const parts = targetPath.split('/app/chat/');
            const firstPart = parts[1];
            if (typeof firstPart === 'string' && firstPart !== '') {
              targetChatId = firstPart.split('?')[0];
            }
          }
          refreshAndOptimisticallyUpdateChat(trpcUtils, targetChatId, payload.payload);

          const currentPathname = globalThis.location.pathname;
          const isCurrentChatOpen =
            typeof targetChatId === 'string' &&
            targetChatId !== '' &&
            currentPathname.includes(`/app/chat/${targetChatId}`);

          if (!isCurrentChatOpen && payload.payload) {
            const notificationTitle =
              typeof payload.payload['title'] === 'string' && payload.payload['title'].trim() !== ''
                ? payload.payload['title'].trim()
                : 'Neue Nachricht';

            let notificationBody = '';
            if (
              typeof payload.payload['body'] === 'string' &&
              payload.payload['body'].trim() !== ''
            ) {
              notificationBody = payload.payload['body'].trim();
            } else if (typeof payload.payload['message'] === 'string') {
              notificationBody = payload.payload['message'].trim();
            }

            toast(notificationTitle, {
              description: notificationBody,
              action: {
                label: 'Ansehen',
                onClick: () => {
                  router.push(targetPath);
                },
              },
            });
          }

          console.log(
            '[Service Worker Manager] PUSH_NAVIGATE received, navigating to:',
            targetPath,
          );
          try {
            sessionStorage.setItem('pending_push_redirect', targetPath);
            localStorage.setItem('pending_push_redirect', targetPath);
          } catch {
            // ignore SSR / storage unavailable
          }
          router.push(targetPath);
        }
      },
      [router, trpcUtils],
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
