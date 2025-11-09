import { i18nExcludedRoutes } from '@/i18n.config';
import type { NextRequest } from 'next/server';

/**
 *  Helper function to check if the route is excluded from path rewrites.
 *
 *  @param request
 */
export const isExcludedFromPathRewrites = (request: NextRequest): boolean => {
  return i18nExcludedRoutes.some((path) => request.nextUrl.pathname.startsWith(`/${path}`));
};
