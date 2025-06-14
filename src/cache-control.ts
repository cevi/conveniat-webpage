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

export const cachingHeaders = async (): Promise<Header[]> => {
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
  ];
};
