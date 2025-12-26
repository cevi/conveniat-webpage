import { cachingHeaders, optimizedImageMinimumCacheTTL } from '@/cache-control';
import bundleAnalyzer from '@next/bundle-analyzer';
import { withPayload } from '@payloadcms/next/withPayload';
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
  serverExternalPackages: ['esbuild-wasm'],
  productionBrowserSourceMaps: true,
  transpilePackages: ['@t3-oss/env-nextjs', '@t3-oss/env-core'],
  poweredByHeader: false,
  reactStrictMode: true,
  cacheComponents: true,

  // enable gzip compression for all responses
  compress: true,

  cacheHandlers: {
    // eslint-disable-next-line unicorn/prefer-module
    default: require.resolve('./src/cache-handlers/default.cjs'),
  },

  // enable react compiler for better error messages and performance
  reactCompiler: true,

  experimental: {
    authInterrupts: true,

    // Forward browser logs to the terminal for easier debugging
    browserDebugInfoInTerminal: true,

    // enable server source maps for better error tracking
    serverSourceMaps: true,

    // Enable filesystem caching for `next dev`
    turbopackFileSystemCacheForDev: true,

    staleTimes: {
      dynamic: 0, // this must be set to 0 for payload to work correctly
      static: 300, // 5 minutes for static pages, default
    },

    serverActions: {
      bodySizeLimit: '10mb',
    },

    inlineCss: true,
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

  rewrites: () => {
    return {
      beforeFiles: [
        {
          source: '/manifest.json',
          destination: '/manifest.webmanifest',
        },
      ],
      afterFiles: [...postHogRewrites()],
    };
  },
  headers: cachingHeaders,
};

export default withBundleAnalyzer(withPayload(nextConfig, { devBundleServerPackages: false }));
