import { i18nRouter } from 'next-i18n-router';
import { NextRequest, NextResponse } from 'next/server';
import { i18nConfig } from '@/types';
import { i18nExcludedRoutes } from '@/i18n.config';

/**
 * Middleware to handle i18n routing.
 * We use next-i18n-router to handle the routing based on the locale.
 *
 * The middleware is applied to all routes except the ones defined in `i18nExcludedRoutes`.
 *
 * @param request - The incoming request
 *
 */
export const middleware = (request: NextRequest): NextResponse => {
  // exclude paths from next-i18n-router
  if (i18nExcludedRoutes.some((path) => request.nextUrl.pathname.startsWith(`/${path}`))) {
    return NextResponse.next();
  }

  // apply i18n routing
  return i18nRouter(request, i18nConfig);
};

// we apply the middleware to all routes
export const config = { middleware: 'all' };
