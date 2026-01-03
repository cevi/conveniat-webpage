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

    // Wait for ready, but don't block indefinitely (e.g. if SW fails to activate)
    const timeoutPromise = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('Service Worker registration timed out')), 5000),
    );
    await Promise.race([navigator.serviceWorker.ready, timeoutPromise]);

    return registration;
  } catch (error) {
    throw new Error('Service Worker registration failed', { cause: error });
  }
};
