import { cachingHeaders, optimizedImageMinimumCacheTTL } from '@/cache-control';
import bundleAnalyzer from '@next/bundle-analyzer';
import { withPayload } from '@payloadcms/next/withPayload';
import { withPostHogConfig } from '@posthog/nextjs-config';
import type { NextConfig } from 'next';
import type { Rewrite } from 'next/dist/lib/load-custom-routes';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env['ANALYZE'] === 'true',
  openAnalyzer: true,
});

/**
 * PostHog rewrites are required for the PostHog integration to work.
 *
 * In our production deployment we are using traefik as the reverse proxy
 * redirects to PostHog are directly handled by traefik and will never
 * reach the Next.js server. We keep these rewrites here for development
 * and testing purposes.
 *
 */
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
  serverExternalPackages: ['esbuild-wasm', 'pdfkit', 'pdfkit-table'],
  productionBrowserSourceMaps: true,
  transpilePackages: ['@t3-oss/env-nextjs', '@t3-oss/env-core'],
  poweredByHeader: false,
  reactStrictMode: true,
  cacheComponents: true,

  /**
   * Our production deployment uses traefik as the reverse proxy and nginx for serving / caching
   * static files. We compress the response in nginx to save CPU cycles on the Next.js server.
   */
  compress: false,

  ...(process.env['NODE_ENV'] !== 'development' && {
    cacheHandlers: {
      default: require.resolve('./src/cache-handlers/default.cjs'),
    },
  }),

  // enable react compiler for better error messages and performance
  reactCompiler: true,

  experimental: {
    inlineCss: true,
    authInterrupts: true,

    // enable server source maps for better error tracking
    serverSourceMaps: true,

    // Enable filesystem caching for `next dev`
    // We disable this in Docker to prevent "Module factory not available" errors
    // caused by filesystem sync latency between host and container.
    turbopackFileSystemCacheForDev: false,

    staleTimes: {
      dynamic: 0, // this must be set to 0 for payload to work correctly
      static: 300, // 5 minutes for static pages, default
    },
  },

  logging: {
    fetches: { fullUrl: true },

    // Forward browser logs to the terminal for easier debugging
    browserToTerminal: true,
  },
  images: {
    minimumCacheTTL: optimizedImageMinimumCacheTTL,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.cevi.ch',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'conveniat27.ch',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'conveniat27.cevi.tools',
        port: '',
      },
      ...(process.env['APP_HOST_URL']
        ? [
            {
              protocol: new URL(process.env['APP_HOST_URL']).protocol.replace(':', '') as
                | 'http'
                | 'https',
              hostname: new URL(process.env['APP_HOST_URL']).hostname,
              port: new URL(process.env['APP_HOST_URL']).port,
            },
          ]
        : []),
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

const config = withBundleAnalyzer(withPayload(nextConfig, { devBundleServerPackages: false }));

export default process.env['POSTHOG_API_KEY']
  ? withPostHogConfig(config, {
      personalApiKey: process.env['POSTHOG_API_KEY'],
      projectId: process.env['POSTHOG_PROJECT_ID'] ?? '',
      host: 'https://eu.posthog.com',
      sourcemaps: {
        deleteAfterUpload: false,
      },
    })
  : config;
