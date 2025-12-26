/**
 * Configuration for pages that should be available offline.
 *
 * When the service worker activates, these pages will be prefetched
 * along with all their dependencies (CSS, JS, images, fonts).
 *
 * Simply add page URLs to this array to make them work offline.
 *
 */
export const offlinePages = [
  // Offline fallback page (required)
  '/~offline',

  // App entrypoint
  '/entrypoint?app-mode=true',

  // Main application dashboard
  '/app/dashboard',

  // Schedule page with local DB offline support
  '/app/schedule',

  // Map viewer with tile caching
  '/app/map',
] as const;

export type OfflinePage = (typeof offlinePages)[number];
