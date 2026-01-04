import { serwist } from '@serwist/next/config';

/**
 * Config file for the serwist service worker.
 * @see https://serwist.pages.dev/docs/next
 */
export default await serwist({
  swSrc: 'src/features/service-worker/sw.ts',
  swDest: 'public/sw.js',
  precachePrerendered: false,
});
