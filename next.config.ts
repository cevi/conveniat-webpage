import build from '@/build';
import bundleAnalyzer from '@next/bundle-analyzer';
import { withPayload } from '@payloadcms/next/withPayload';
import withSerwistInit from '@serwist/next';
import type { NextConfig } from 'next';
import type { Header, Rewrite } from 'next/dist/lib/load-custom-routes';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env['ANALYZE'] === 'true',
  openAnalyzer: true,
});

const postHogRewrites = async (): Promise<Rewrite[]> => {
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

const cachingHeaders = async (): Promise<Header[]> => {
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

const nextConfig: NextConfig = {
  output: 'standalone',
  productionBrowserSourceMaps: true,
  serverExternalPackages: ['mongodb', 'mongoose'],
  transpilePackages: ['@t3-oss/env-nextjs', '@t3-oss/env-core'],
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    moduleIds: 'named',
  },
  logging: { fetches: { fullUrl: true } },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
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
  additionalPrecacheEntries: [{ url: '/offline', revision: serviceWorkerRevision }],
  register: true,
  reloadOnOnline: true,
  disable:
    (process.env.NODE_ENV !== 'production' &&
      process.env['ENABLE_SERVICE_WORKER_LOCALLY'] !== 'true') ||
    process.env['DISABLE_SERVICE_WORKER'] === 'true',
});

export default withBundleAnalyzer(
  withSerwist(withPayload(nextConfig, { devBundleServerPackages: false })),
);
