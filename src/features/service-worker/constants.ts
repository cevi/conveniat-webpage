export const CACHE_NAMES = {
  // Runtime
  PAGES: 'pages-cache-v1',
  RSC: 'next-rsc-cache-v1',
  API: 'next-api-cache-v1',

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
} as const;

export const TIMEOUTS = {
  DEFAULT_FETCH: 10_000, // 10 seconds
  RSC_FETCH: 15_000, // 15 seconds
  PREFETCH_CONCURRENCY: 5,
} as const;
