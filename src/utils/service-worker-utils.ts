import { environmentVariables } from '@/config/environment-variables';

/**
 * URL of the service worker to register.
 */
export const SW_URL = '/sw.js' as const;

/**
 * Options for every registration of {@link SW_URL}.
 *
 * The worker is registered from two places: here, and through `SerwistProvider` in the
 * service worker manager. The browser compares each registration against the installed worker,
 * and a different `type` counts as a new worker even when the script is byte-for-byte the same.
 * With the provider defaulting to `module` and this function to `classic`, every launch through
 * `/entrypoint` installed and activated a fresh worker. That re-ran the full offline download
 * on each launch and hung the navigations that were in flight during the takeover.
 *
 * The build emits a classic script, so `classic` is the type to use.
 */
export const SW_REGISTRATION_OPTIONS = {
  scope: '/',
  type: 'classic',
  updateViaCache: 'none',
} as const satisfies RegistrationOptions;

/**
 * Registers the Service Worker.
 * @returns The ServiceWorkerRegistration if successful, or undefined if not supported or failed.
 */
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | undefined> => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return undefined;
  }

  if (environmentVariables.NEXT_PUBLIC_DISABLE_SERWIST) {
    console.log(
      '[Service Worker] Registration skipped because NEXT_PUBLIC_DISABLE_SERWIST is true.',
    );
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      let unregisteredAny = false;
      for (const registration of registrations) {
        const success = await registration.unregister();
        if (success) {
          console.log('[Service Worker] Unregistered active service worker:', registration.scope);
          unregisteredAny = true;
        }
      }
      if (unregisteredAny) {
        console.log('[Service Worker] Reloading page to clear stale cache.');
        globalThis.location.reload();
      }
    } catch (error) {
      console.error('[Service Worker] Failed to unregister service workers:', error);
    }
    return undefined;
  }

  try {
    // Check if the service worker is already registered
    const existingRegistration = await navigator.serviceWorker.getRegistration();
    if (existingRegistration?.active?.scriptURL.endsWith(SW_URL) === true) {
      console.log('Service worker already registered, byte-to-byte update check triggered');
    }

    const registration = await navigator.serviceWorker.register(SW_URL, SW_REGISTRATION_OPTIONS);

    // Wait for ready, but handle timeout gracefully without crashing the app in production
    const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, 15_000));
    await Promise.race([navigator.serviceWorker.ready, timeoutPromise]);

    return registration;
  } catch (error) {
    console.warn('[Service Worker] Registration failed or timed out:', error);
    return undefined;
  }
};
