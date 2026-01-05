/**
 * Configuration for pages that should be available offline.
 *
 * When the service worker activates, these pages will be prefetched
 * along with all their dependencies (CSS, JS, images, fonts).
 *
 * Download: Only when manually trigger the "Start Offline Download"
 * action (or whenever the code calls prefetchOfflinePages).
 *
 * Simply add page URLs to this array to make them work offline.
 *
 */
export const offlinePages = [
  // App entrypoint
  '/entrypoint',
  '/entrypoint?app-mode=true',
  '/entrypoint?force-app-mode=true',

  // Main application dashboard
  '/app/dashboard',

  // Schedule page with local DB offline support
  '/app/schedule',
  '/app/schedule/offline-entry',

  // emergency information page
  '/app/emergency',

  // Map viewer with tile caching
  '/app/map',

  // offline page
  '/~offline',
] as const;
