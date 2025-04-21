import { withPayload } from '@payloadcms/next/withPayload';

import withSerwistInit from '@serwist/next';

// TODO: see https://github.com/serwist/serwist/blob/main/examples/next-basic/next.config.mjs
// You may want to use a more robust revision to cache
// files more efficiently.
// A viable option is `git rev-parse HEAD`.
const revision = crypto.randomUUID();

const withSerwist = withSerwistInit({
  cacheOnNavigation: true,
  swSrc: 'src/feature/service-worker/index.ts',
  swDest: 'public/sw.js',
  additionalPrecacheEntries: [{ url: '/offline', revision }],
  register: true,
  reloadOnOnline: true,
  disable:
    process.env.NODE_ENV !== 'production' && process.env.ENABLE_SERVICE_WORKER_LOCALLY !== 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  productionBrowserSourceMaps: process.env.INCLUDE_SOURCE_MAP === 'true',
  serverExternalPackages: ['mongodb', 'mongoose'],
  reactStrictMode: true,
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
};

export default withSerwist(withPayload(nextConfig, { devBundleServerPackages: false }));
