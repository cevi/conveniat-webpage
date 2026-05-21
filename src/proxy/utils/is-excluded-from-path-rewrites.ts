import { i18nExcludedRoutes } from '@/i18n.config';
import type { NextRequest } from 'next/server';

/**
 *  Helper function to check if the route is excluded from path rewrites.
 *
 *  @param request
 */
export const isExcludedFromPathRewrites = (request: NextRequest): boolean => {
  const { pathname } = request.nextUrl;

  // Do not rewrite static assets/chunks (e.g. JS, CSS, maps, images, manifests, sitemaps, webmanifest, xml)
  const isStaticAsset =
    /\.(js|css|png|ico|svg|webmanifest|xml|txt|jpg|jpeg|gif|map|json)$/i.test(pathname) ||
    pathname.startsWith('/imgs/') ||
    pathname.startsWith('/serwist/');

  if (isStaticAsset) {
    return true;
  }

  return i18nExcludedRoutes.some(
    (path) => pathname === `/${path}` || pathname.startsWith(`/${path}/`),
  );
};
