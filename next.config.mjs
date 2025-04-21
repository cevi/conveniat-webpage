import { withPayload } from '@payloadcms/next/withPayload';
import createJiti from 'jiti';
import { fileURLToPath } from 'node:url';

import withSerwistInit from '@serwist/next';

// TODO: see https://github.com/serwist/serwist/blob/main/examples/next-basic/next.config.mjs
// You may want to use a more robust revision to cache
// files more efficiently.
// A viable option is `git rev-parse HEAD`.
const revision = crypto.randomUUID();

// verify enviroment variables at build time
const jiti = createJiti(fileURLToPath(import.meta.url));
jiti('./src/config/environment-variables.ts');

const withSerwist = withSerwistInit({
  cacheOnNavigation: true,
  swSrc: 'src/features/service-worker/index.ts',
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
  transpilePackages: ['@t3-oss/env-nextjs', '@t3-oss/env-core'],
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
