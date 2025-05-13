import type { NextConfig } from 'next';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { withPayload } from '@payloadcms/next/withPayload';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import build from '@/build';
import withSerwistInit from '@serwist/next';

const serviceWorkerRevision =
  process.env.NODE_ENV === 'production' ? build.git.hash : Math.random().toString(36).slice(2);

if (process.env['ENABLE_SERVICE_WORKER_LOCALLY'] === 'true') {
  console.log(`serviceWorkerRevision: ${serviceWorkerRevision}`);
}

const withSerwist = withSerwistInit({
  cacheOnNavigation: true,
  swSrc: 'src/features/service-worker/index.ts',
  swDest: 'public/sw.js',
  additionalPrecacheEntries: [{ url: '/offline', revision: serviceWorkerRevision }],
  register: true,
  reloadOnOnline: true,
  disable:
    process.env.NODE_ENV !== 'production' &&
    process.env['ENABLE_SERVICE_WORKER_LOCALLY'] !== 'true',
});

const nextConfig: NextConfig = {
  output: 'standalone',
  productionBrowserSourceMaps: process.env['INCLUDE_SOURCE_MAP'] === 'true',
  serverExternalPackages: ['mongodb', 'mongoose'],
  transpilePackages: ['@t3-oss/env-nextjs', '@t3-oss/env-core'],
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    moduleIds: 'named',
  },
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
