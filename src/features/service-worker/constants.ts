export const CACHE_NAMES = {
  // Runtime
  PAGES: 'pages-cache-v1',
  RSC: 'next-rsc-cache-v1',

  // Assets
  CSS: 'next-css-cache-v1',
  JS: 'next-js-cache-v1',
  IMAGES: 'images-cache-v1',
  FONTS: 'next-fonts-cache-v1',
  NEXTJS_FONTS: 'nextjs-fonts-cache-v1',

  // Offline Features
  OFFLINE_ASSETS: 'offline-assets-cache-v1',
  MAP_TILES: 'map-tiles-cache-v1',
  OFFLINE_STATUS: 'offline-status-cache-v1',
  APP_MODE: 'app-mode-persistence-v1',
  AUTH_SESSION: 'next-auth-session-cache',
} as const;

/** Key in the `OFFLINE_STATUS` cache that records a completed offline download. */
export const OFFLINE_ENABLED_FLAG = 'offline-enabled';

export const TIMEOUTS = {
  DEFAULT_FETCH: 10_000, // 10 seconds
  RSC_FETCH: 3000, // 3 seconds
  // The entrypoint gives up on a session check that is still loading after 3 s and treats the
  // user as logged out, so the worker has to answer from its cache before that.
  SESSION_FETCH: 2500,
  PREFETCH_CONCURRENCY: 20, // High concurrency to utilize HTTP/2 streams for map tiles
  ASSET_FETCH: 15_000, // 15 seconds per asset
  PROGRESS_STALL: 25_000, // 25 seconds without progress = stall
  MAX_RETRIES: 3, // Retry failed fetches up to 3 times
  BACKOFF_BASE: 500, // Start with 500ms delay
} as const;
