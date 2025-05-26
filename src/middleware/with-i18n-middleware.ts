import { i18nExcludedRoutes } from '@/i18n.config';
import type { ChainedMiddleware } from '@/middleware/middleware-chain';
import { i18nConfig } from '@/types/types';
import { i18nRouter } from 'next-i18n-router';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Helper function to check if the route is excluded from i18n
const isExcludedFromI18n = (request: NextRequest): boolean => {
  return i18nExcludedRoutes.some((path) => request.nextUrl.pathname.startsWith(`/${path}`));
};

/**
 * Middleware to handle i18n routing.
 *
 * This middleware uses next-i18n-router to handle the routing based on the locale. This
 * middleware is applied to all routes except the ones defined in `i18nExcludedRoutes`. And
 * must be the last middleware in the chain.
 */
export const withI18nMiddleware = (): ChainedMiddleware => {
  return (request, _event, response): NextResponse => {
    response ??= NextResponse.next();
    if (isExcludedFromI18n(request)) {
      // initialize response if isn't already set
      return response;
    }

    if (!request.cookies.get('NEXT_LOCALE')) {
      const pathname = request.nextUrl.pathname;
      const firstSegment = pathname
        // split the pathname into segments
        .split('/')
        // drop empty segments
        .find((segment) => segment.length > 0);

      // if the first segment of the path is not a locale (from all configured locales),
      // we set the locale to the default local
      if (firstSegment !== undefined && !i18nConfig.locales.includes(firstSegment)) {
        response.cookies.set('NEXT_LOCALE', i18nConfig.defaultLocale, { path: '/' });
        return response;
      }
    }

    return i18nRouter(request, i18nConfig);
  };
};
