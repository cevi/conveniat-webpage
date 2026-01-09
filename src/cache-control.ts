import type { Header } from 'next/dist/lib/load-custom-routes';

/**
 * This controls how long an optimized image is cached inside the next/image cache. Normally,
 * we should keep this value low, as there is no direct way to invalidate the cache.
 *
 * However, since we use the payload api to request our original images, and we rename the
 * original images on every change to the image object, we can safely set this to a high value.
 *
 * After 90 days, we revalidate the next/image cache.
 *
 * It is important that the images get cached longer than any potential cache of an HTML page that
 * references the image, such that the image is always available when the page is requested.
 *
 * Note: this has no effect for the local development server.
 *
 * @link https://nextjs.org/docs/pages/api-reference/components/image#minimumcachettl
 *
 * @source https://github.com/vercel/next.js/blob/70cbcf1aa0866b284a14ebf6e48e23483dc60ae9/packages/next/src/server/image-optimizer.ts#L517-L532
 *
 */
export const optimizedImageMinimumCacheTTL = 90 * 24 * 60 * 60; // 90 days in seconds

export const cachingHeaders = (): Header[] => {
  return [
    {
      source: '/sitemap.xml',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=300', // Cache for 5 minutes
        },
      ],
    },
    {
      source: '/manifest.webmanifest',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=300', // Cache for 5 minutes
        },
      ],
    },

    /**
     * Our production deployment uses traefik as the reverse proxy and nginx for serving / caching
     * static files. This tells nginx to disable proxy_buffering for this request, which allows
     * us to stream the response to the client as soon as it is available.
     */
    {
      source: '/:path*', // apply to all routes
      headers: [
        {
          key: 'X-Accel-Buffering',
          value: 'no', // tells Nginx to disable proxy_buffering
        },
      ],
    },
  ];
};
