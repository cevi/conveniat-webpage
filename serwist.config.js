import { serwist } from '@serwist/next/config';

/**
 * Config file for the serwist service worker.
 * @see https://serwist.pages.dev/docs/next
 */
export default await serwist({
  swSrc: 'src/features/service-worker/sw.ts',
  swDest: 'public/sw.js',
  precachePrerendered: false,
  globIgnores: ['**/node_modules/**/*', '**/admin-block-images/**/*'],
  esbuildOptions: {
    define: {
      // Unlike Next's compiler, the standalone serwist build does not inline
      // env variables, and a service worker has no `process` global — any
      // surviving `process.env` access crashes the whole worker at evaluation
      // time (#1492). Inline the public env so such accesses resolve to a
      // value (or undefined) at build time instead.
      'process.env': JSON.stringify({
        ...Object.fromEntries(
          Object.entries(process.env).filter(([key]) => key.startsWith('NEXT_PUBLIC_')),
        ),
        NODE_ENV: process.env.NODE_ENV ?? 'production',
      }),
    },
  },
});
