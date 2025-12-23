import { createSerwistRoute } from '@serwist/turbopack';
import { spawnSync } from 'node:child_process';

const gitResult = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
const revision = gitResult.stdout ? gitResult.stdout.trim() : crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute(
  {
    additionalPrecacheEntries: [{ url: '/~offline', revision }],
    swSrc: 'src/features/service-worker/index.ts',
    // Copy relevant Next.js configuration (assetPrefix, basePath, distDir) over if you've changed them.
    nextConfig: {},
  },
);
