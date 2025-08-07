/**
 * Paths that should be excluded from next-i18n-router.
 */
export const i18nExcludedRoutes: string[] = [
  // Static Assets and Images
  'imgs',
  'favicon-96x96.png',
  'favicon.ico',
  'apple-touch-icon.png',
  'web-app-manifest-192x192.png',
  'web-app-manifest-512x512.png',
  'favicon.svg',
  'notification-icon.png',

  // system endpoints
  'status',

  // app landing page (is localized manually)
  'entrypoint',
  'login',

  // Internal Paths (API, Admin Panel of Payload CMS)
  '_next',
  'api',
  'admin',
  '.well-known',

  // posthog analytics
  'ingest',

  // map styles
  'vector-map',

  // Static Files (Service Workers, Manifests, SEO)
  'sw.js',
  'swe-worker-',
  'manifest.webmanifest',
  'sitemap.xml',
  'robots.txt',
] as const;
