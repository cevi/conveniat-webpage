import { environmentVariables } from '@/config/environment-variables';

/**
 * URL of the service worker to register.
 */
const SW_URL = '/sw.js' as const;

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

    const registration = await navigator.serviceWorker.register(SW_URL, {
      scope: '/',
      updateViaCache: 'none',
    });

    // Wait for ready, but handle timeout gracefully without crashing the app in production
    const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, 15_000));
    await Promise.race([navigator.serviceWorker.ready, timeoutPromise]);

    return registration;
  } catch (error) {
    console.warn('[Service Worker] Registration failed or timed out:', error);
    return undefined;
  }
};
