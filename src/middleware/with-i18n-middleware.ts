import type { ChainedMiddleware } from '@/middleware/middleware-chain';
import { isExcludedFromPathRewrites } from '@/middleware/utils/is-excluded-from-path-rewrites';
import { i18nConfig } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
import { i18nRouter } from 'next-i18n-router';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Helper function to get the first segment of the path from the request.
 * We skip DesignCodes as first segments.
 *
 * @param request
 */
const getFirstSegment = (request: NextRequest): string | undefined => {
  return request.nextUrl.pathname
    .split('/')
    .filter((segment) => segment.length > 0)
    .filter((segment) => segment !== DesignCodes.APP_DESIGN.toString())
    .find((segment) => segment !== DesignCodes.WEB_DESIGN.toString());
};

/**
 * Middleware to handle i18n routing.
 *
 * This middleware uses next-i18n-router to handle the routing based on the locale. This
 * middleware is applied to all routes except the ones defined in `i18nExcludedRoutes`.
 *
 */
export const withI18nMiddleware = (nextMiddleware: ChainedMiddleware): ChainedMiddleware => {
  return (request, _event, response): NextResponse => {
    // initialize response if isn't already set
    response ??= NextResponse.next();

    // if the request is for an excluded route, we skip the i18n routing
    if (isExcludedFromPathRewrites(request)) return response;

    if (!request.cookies.get('NEXT_LOCALE')) {
      const firstSegment = getFirstSegment(request);

      // if the first segment of the path is not a locale (from all configured locales),
      // we set the locale to the default locale
      if (firstSegment !== undefined && !i18nConfig.locales.includes(firstSegment)) {
        response.cookies.set('NEXT_LOCALE', i18nConfig.defaultLocale, {
          path: '/',
          maxAge: 60 * 60 * 24 * 365,
        });
        return response;
      }
    }

    response = i18nRouter(request, i18nConfig);

    // remove /de/ from path, as this is the default locale
    const url = request.nextUrl.clone();
    const firstSegment = getFirstSegment(request);
    if (firstSegment === i18nConfig.defaultLocale) {
      url.pathname = url.pathname.replace(`/${i18nConfig.defaultLocale}`, '');
      return NextResponse.redirect(url, {
        headers: response.headers,
        status: 307,
      });
    }

    return nextMiddleware(request, _event, response) as NextResponse;
  };
};
