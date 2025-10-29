import build from '@/build';
import { cachingHeaders, optimizedImageMinimumCacheTTL } from '@/cache-control';
import bundleAnalyzer from '@next/bundle-analyzer';
import { withPayload } from '@payloadcms/next/withPayload';
import withSerwistInit from '@serwist/next';
import type { NextConfig } from 'next';
import type { Rewrite } from 'next/dist/lib/load-custom-routes';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env['ANALYZE'] === 'true',
  openAnalyzer: true,
});

const postHogRewrites = (): Rewrite[] => {
  return [
    {
      source: '/ingest/static/:path*',
      destination: 'https://eu-assets.i.posthog.com/static/:path*',
    },
    {
      source: '/ingest/:path*',
      destination: 'https://eu.i.posthog.com/:path*',
    },
    {
      source: '/ingest/decide',
      destination: 'https://eu.i.posthog.com/decide',
    },
  ];
};

const nextConfig: NextConfig = {
  output: 'standalone',
  productionBrowserSourceMaps: true,
  transpilePackages: ['@t3-oss/env-nextjs', '@t3-oss/env-core'],
  poweredByHeader: false,
  reactStrictMode: true,

  // enable gzip compression for all responses
  compress: true,

  // enable react compiler for better error messages and performance
  reactCompiler: true,

  experimental: {
    // Forward browser logs to the terminal for easier debugging
    browserDebugInfoInTerminal: true,

    // enable server source maps for better error tracking
    serverSourceMaps: true,

    // activate new client-side router improvements
    clientSegmentCache: true,

    staleTimes: {
      dynamic: 0, // this must be set to 0 for payload to work correctly
      static: 300, // 5 minutes for static pages, default
    },

    // user uploads are bigger --> we need bigger body sizes
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  logging: { fetches: { fullUrl: true } },
  images: {
    minimumCacheTTL: optimizedImageMinimumCacheTTL,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.cevi.ch',
        port: '',
      },
    ],
  },

  rewrites: postHogRewrites,
  headers: cachingHeaders,

  // Support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

const serviceWorkerRevision =
  process.env.NODE_ENV === 'production' ? build.git.hash : Math.random().toString(36).slice(2);

if (process.env['ENABLE_SERVICE_WORKER_LOCALLY'] === 'true') {
  console.log(`serviceWorkerRevision: ${serviceWorkerRevision}`);
}

export const withSerwist = withSerwistInit({
  cacheOnNavigation: true,
  swSrc: 'src/features/service-worker/index.ts',
  swDest: 'public/sw.js',
  register: true,
  reloadOnOnline: false, // don't reload the page when going online
  disable:
    (process.env.NODE_ENV !== 'production' &&
      process.env['ENABLE_SERVICE_WORKER_LOCALLY'] !== 'true') ||
    process.env['DISABLE_SERVICE_WORKER'] === 'true',
});

export default withBundleAnalyzer(
  withSerwist(withPayload(nextConfig, { devBundleServerPackages: false })),
);
