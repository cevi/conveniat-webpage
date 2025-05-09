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
    if (isExcludedFromI18n(request)) {
      // initialize response if not already set
      response ??= NextResponse.next();
      return response;
    }

    return i18nRouter(request, i18nConfig);
  };
};
