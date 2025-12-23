import { createSerwistRoute } from '@serwist/turbopack';
import { spawnSync } from 'node:child_process';

// Using `git rev-parse HEAD` to determine a revision for cache busting.
// In production builds, this is more reliable than a random UUID.
const revision =
  spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout?.trim() ??
  crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute(
  {
    additionalPrecacheEntries: [{ url: '/~offline', revision }],
    swSrc: 'src/features/service-worker/index.ts',
    // Copy relevant Next.js configuration (assetPrefix, basePath, distDir) over if you've changed them.
    nextConfig: {},
  },
);
