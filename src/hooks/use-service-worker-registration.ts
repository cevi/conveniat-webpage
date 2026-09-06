'use client';

import React from 'react';

/**
 * The part of a Serwist instance this hook drives. Keeping it structural means the hook
 * can be exercised without a browser and without constructing a real Serwist instance.
 */
export interface RegistrableServiceWorker {
  register: () => Promise<ServiceWorkerRegistration | undefined>;
}

/**
 * Serwist instances live on `window`, so they outlive the components that render them.
 * A WeakSet keeps the "register once" promise tied to the instance instead of to a mount,
 * which is what `@serwist/next` does by only registering when it creates the instance.
 */
const alreadyRegistered = new WeakSet<RegistrableServiceWorker>();

/**
 * Registers the service worker once per Serwist instance and swallows a failed
 * registration.
 *
 * Registration is not guaranteed to succeed: enterprise policies, privacy modes and
 * instrumented browsers can refuse it or stub `navigator.serviceWorker.register()` so that
 * it resolves with nothing, which makes Serwist throw while reading the registration.
 * Without offline support the app still works, so a failure is logged and the page carries
 * on rather than surfacing as an unhandled rejection.
 *
 * @param serwist the Serwist instance to register, or `null` when there is none
 */
export const useServiceWorkerRegistration = (serwist: RegistrableServiceWorker | null): void => {
  React.useEffect(() => {
    if (serwist === null || alreadyRegistered.has(serwist)) {
      return;
    }
    alreadyRegistered.add(serwist);

    serwist.register().catch((error: unknown) => {
      console.warn(
        '[Service Worker Manager] Service worker registration failed, continuing without offline support:',
        error,
      );
    });
  }, [serwist]);
};
