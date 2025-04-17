import { i18nRouter } from 'next-i18n-router';
import { NextRequest, NextResponse } from 'next/server';
import { Cookie, i18nConfig } from '@/types';
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
  const response = NextResponse.next();

  // check if app design feature is enabled, render app design if enabled
  if (process.env['FEATURE_ENABLE_APP_FEATURE'] === 'true') {
    if (
      request.nextUrl.pathname !== '/entrypoint' &&
      request.cookies.has(Cookie.APP_DESIGN) &&
      !request.cookies.has(Cookie.CONVENIAT_COOKIE_BANNER)
    ) {
      return NextResponse.redirect(new URL('/entrypoint', request.url));
    }

    if (
      request.nextUrl.pathname === '/entrypoint' &&
      request.cookies.has(Cookie.APP_DESIGN) &&
      request.cookies.has(Cookie.CONVENIAT_COOKIE_BANNER)
    ) {
      console.log('App design already set, redirecting to /');
      return NextResponse.redirect(new URL('/', request.url));
    }
  } else {
    if (request.cookies.has(Cookie.APP_DESIGN)) {
      response.cookies.delete(Cookie.APP_DESIGN);
    }
    if (
      [...i18nConfig.locales, ''].some((locale) =>
        request.nextUrl.pathname.startsWith(`/${locale}/app`),
      ) ||
      request.nextUrl.pathname.startsWith('/entrypoint')
    ) {
      return NextResponse.rewrite(new URL('/', request.url));
    }
  }

  // in order to render the preview banner for any frontend page, we
  // inject the `preview` cookie with the value `true` when the user
  // navigates to the admin panel. This way, we don't show the preview
  // banner when an admin signs in to the app but never navigates to
  // the admin panel (e.g. while using the app).
  if (
    request.nextUrl.pathname.startsWith('/admin') && // set cookie if not set
    !request.cookies.has('preview')
  ) {
    console.log('Setting preview cookie');
    response.cookies.set('preview', 'true');
  }

  // exclude paths from next-i18n-router
  if (i18nExcludedRoutes.some((path) => request.nextUrl.pathname.startsWith(`/${path}`))) {
    return response;
  }

  // apply i18n routing
  return i18nRouter(request, i18nConfig);
};

// we apply the middleware to all routes
export const config = { middleware: 'all' };
