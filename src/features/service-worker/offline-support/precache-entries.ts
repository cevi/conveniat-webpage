/**
 * Additional precache entries for the service worker.
 * These are critical assets that should be available offline
 * in addition to the auto-generated manifest.
 *
 * These URLs are injected into the Service Worker's manifest
 * during the build process.
 *
 * They download immediately when the Service Worker is
 * installing (first visit).
 *
 */
export const precacheEntries = [
  '/entrypoint',
  '/entrypoint?force-app-mode=true',
  '/entrypoint?app-mode=true',
  '/~offline',
] as const;
