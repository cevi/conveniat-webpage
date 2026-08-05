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

  // Landing page
  '/',

  // Main application dashboard
  '/app/dashboard',

  // Chat page
  '/app/chat',

  // Schedule page with local DB offline support
  '/app/schedule',

  // Helper Portal page
  '/app/helper-portal',

  // emergency information page
  '/app/emergency',

  // Map viewer with tile caching
  '/app/map',

  // Settings page
  '/app/settings',

  // Offline pages
  '/~offline',
  '/~offline?app-mode=true',
] as const;
