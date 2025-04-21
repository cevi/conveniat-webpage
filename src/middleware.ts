import { i18nRouter } from 'next-i18n-router';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { Cookie, i18nConfig } from '@/types/types';
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

  if (isAppFeatureEnabled(request, response)) {
    return response;
  }

  handlePreviewCookie(request, response);

  if (isExcludedFromI18n(request)) {
    return response;
  }

  return i18nRouter(request, i18nConfig);
};

function isAppFeatureEnabled(request: NextRequest, response: NextResponse): boolean {
  const isFeatureEnabled = process.env['FEATURE_ENABLE_APP_FEATURE'] === 'true';
  const url = request.nextUrl;
  const { pathname } = url;

  const hasAppDesign = request.cookies.has(Cookie.APP_DESIGN);
  const hasCookieBanner = request.cookies.has(Cookie.CONVENIAT_COOKIE_BANNER);
  const isEntrypoint = pathname === '/entrypoint';
  const isAppPath = [...i18nConfig.locales, ''].some((locale) =>
    pathname.startsWith(`/${locale}/app`),
  );

  if (isFeatureEnabled) {
    return handleAppFeatureEnabled(request, isEntrypoint, hasAppDesign, hasCookieBanner);
  }

  if (hasAppDesign) {
    response.cookies.delete(Cookie.APP_DESIGN);
  }

  const shouldRewrite = isAppPath || isEntrypoint;
  if (shouldRewrite) {
    NextResponse.rewrite(new URL('/', request.url));
    return true;
  }

  return false;
}

function handleAppFeatureEnabled(
  request: NextRequest,
  isEntrypoint: boolean,
  hasAppDesign: boolean,
  hasCookieBanner: boolean,
): boolean {
  const shouldRedirectToEntrypoint = !isEntrypoint && hasAppDesign && !hasCookieBanner;
  if (shouldRedirectToEntrypoint) {
    NextResponse.redirect(new URL('/entrypoint', request.url));
    return true;
  }

  const shouldRedirectToHome = isEntrypoint && hasAppDesign && hasCookieBanner;
  if (shouldRedirectToHome) {
    console.log('App design already set, redirecting to /');
    NextResponse.redirect(new URL('/', request.url));
    return true;
  }

  return false;
}

// Helper function to handle preview cookie logic
function handlePreviewCookie(request: NextRequest, response: NextResponse): void {
  if (request.nextUrl.pathname.startsWith('/admin') && !request.cookies.has('preview')) {
    console.log('Setting preview cookie');
    response.cookies.set('preview', 'true');
  }
}

// Helper function to check if the route is excluded from i18n
function isExcludedFromI18n(request: NextRequest): boolean {
  return i18nExcludedRoutes.some((path) => request.nextUrl.pathname.startsWith(`/${path}`));
}

// we apply the middleware to all routes
export const config = { middleware: 'all' };
