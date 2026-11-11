'use client';

import { environmentVariables } from '@/config/environment-variables';
import { useAppMode } from '@/hooks/use-app-mode';
import { useFullLoadAfterRelease } from '@/hooks/use-full-load-after-release';
import { usePushNavigation } from '@/hooks/use-push-navigation';
import { usePushSubscriptionKeyRenewal } from '@/hooks/use-push-subscription-key-renewal';
import { useServiceWorkerClientUrlResponder } from '@/hooks/use-service-worker-client-url-responder';
import { useServiceWorkerMessage } from '@/hooks/use-service-worker-message';
import { useServiceWorkerRegistration } from '@/hooks/use-service-worker-registration';
import { SerwistProvider, useSerwist } from '@/lib/serwist-client';
import { useOptionalTrpcQueries } from '@/trpc/client';
import { refreshChatOfPush } from '@/utils/push-query-refresher';
import { chatIdOfTarget, resolvePushTarget } from '@/utils/push-target';
import { ServiceWorkerMessages } from '@/utils/service-worker-messages';
import { SW_REGISTRATION_OPTIONS, SW_URL } from '@/utils/service-worker-utils';
import type { ReactNode } from 'react';
import React from 'react';

interface ServiceWorkerManagerProperties {
  children: ReactNode;
}

/**
 * Registers the service worker created by {@link SerwistProvider}.
 *
 * `SerwistProvider` would register it itself, but it does so without handling a rejected
 * registration, which turns a browser that cannot install a service worker into an
 * unhandled rejection on every page load. The provider registers with the default scope
 * `/`, so its own out-of-scope check never applies here.
 */
const ServiceWorkerRegistration: React.FC = () => {
  const { serwist } = useSerwist();
  useServiceWorkerRegistration(serwist);
  return <></>;
};

/**
 * A central component to manage Service Worker registration and App Mode detection.
 * This ensures that the SW is registered consistently across different layouts.
 */
export const ServiceWorkerManager: React.FC<ServiceWorkerManagerProperties> = ({ children }) => {
  useAppMode();
  const { navigateToPushTarget } = usePushNavigation();
  const trpcQueries = useOptionalTrpcQueries();

  useServiceWorkerClientUrlResponder();
  usePushSubscriptionKeyRenewal();
  useFullLoadAfterRelease();

  useServiceWorkerMessage<{ url?: string }>(
    ServiceWorkerMessages.PUSH_NAVIGATE,
    React.useCallback(
      (payload, event) => {
        if (typeof payload.url !== 'string' || payload.url.trim() === '') return;
        // Tells the worker that this page routes the tap itself, so it does not load the
        // target anew on top of the soft navigation.
        event.ports[0]?.postMessage({ handled: true });

        const target = resolvePushTarget(payload.url.trim());
        refreshChatOfPush(trpcQueries, chatIdOfTarget(target));
        navigateToPushTarget(target);
      },
      [navigateToPushTarget, trpcQueries],
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

  return (
    // `reloadOnOnline` defaults to a full `location.reload()` on every `online` event. Camp wifi
    // drops and returns every few minutes, and each reload threw away whatever the user was
    // typing or reading. Nothing needs it: queries refetch on reconnect and the chat outbox
    // drains on its own.
    //
    // `cacheOnNavigation` defaults to on: it patches `history.pushState` and `replaceState` and
    // posts every URL to the worker as `CACHE_URLS`. Our worker never handles that message, and
    // when the router passes a URL object instead of a string, `postMessage` throws a
    // DataCloneError.
    <SerwistProvider
      register={false}
      reloadOnOnline={false}
      cacheOnNavigation={false}
      swUrl={SW_URL}
      options={SW_REGISTRATION_OPTIONS}
    >
      <ServiceWorkerRegistration />
      {children}
    </SerwistProvider>
  );
};
