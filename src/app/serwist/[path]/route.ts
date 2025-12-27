import { precacheEntries } from '@/features/service-worker/offline-support/precache-entries';
import { createSerwistRoute } from '@serwist/turbopack';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import { type NextRequest, NextResponse } from 'next/server';

// Use BUILD_ID from environment
// eslint-disable-next-line n/no-process-env
const revision = process.env['BUILD_ID'] ?? 'development';

const serwistConfig = createSerwistRoute({
  additionalPrecacheEntries: precacheEntries.map(
    (url: string): { url: string; revision: string } => ({ url, revision }),
  ),
  swSrc: 'src/features/service-worker/sw.ts',
  nextConfig: { basePath: '/' },
});

// Enforce SSG for the service worker route
// WARNING: this is undocumented behavior and may break in future Next.js versions
//    we are exploiting a bug that we can mix static rendering and cache components
//    if we are setting, dynamic, dynamicParams, and revalidate in object export form
export const { dynamic, dynamicParams, revalidate } = {
  dynamic: 'force-static',
  dynamicParams: false,
  revalidate: false,
};

// SSG /serwist/sw.js and /serwist/sw.js.map
export const { generateStaticParams } = serwistConfig;

/**
 * Custom GET handler to bypass draft mode for the Service Worker.
 *
 * * Problem: When draft mode is active, Next.js sends a bypass cookie. This forces
 *   this route to run dynamically. Serwist crashes dynamically because it needs
 *   build-time context unavailable in the Docker runtime.
 *
 * * Fix: We detect draft mode. If found, we `fetch` this same URL
 *   *without cookies*. Next.js sees the cookie-less request and serves the
 *   pre-built static file (SSG) from the cache. We then return that file.
 */
export async function GET(request: NextRequest, context: never): Promise<NextResponse> {
  // only build service worker at build time, avoid 500 error due to mising dependencies
  if (
    // eslint-disable-next-line n/no-process-env
    process.env['NEXT_PHASE'] === PHASE_PRODUCTION_BUILD
  ) {
    console.log(`[Serwist] Building ${request.nextUrl.pathname}`);
    return serwistConfig.GET(request, context);
  }

  // try to retrieve pre-build file
  const localUrl = `http://127.0.0.1:3000${request.nextUrl.pathname}`;
  console.log(`[Serwist] Bypassing draft mode via self-fetch to: ${localUrl}`);

  const staticResponse = await fetch(localUrl, {
    cache: 'force-cache',
  });

  if (staticResponse.ok) {
    return new NextResponse(staticResponse.body, {
      status: 200,
      headers: staticResponse.headers,
    });
  }

  // fallback 404
  return NextResponse.json({ error: 'Self-fetch for static SW failed' }, { status: 404 });
}
