import { environmentVariables } from '@/config/environment-variables';
import type { ChainedMiddleware } from '@/middleware/middleware-chain';
import { isExcludedFromPathRewrites } from '@/middleware/utils/is-excluded-from-path-rewrites';
import { Cookie, i18nConfig } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
import type { NextMiddlewareResult } from 'next/dist/server/web/types';
import { type NextFetchEvent, type NextRequest, NextResponse } from 'next/server';

const applyMiddlewareForAppFeatures = (
  request: NextRequest,
  event: NextFetchEvent,
  response: NextResponse,
  middleware: ChainedMiddleware,
): NextMiddlewareResult | Promise<NextMiddlewareResult> => {
  const { pathname } = request.nextUrl;
  const isInAppDesign = request.cookies.has(Cookie.APP_DESIGN);
  const isAtEntrypointPage = pathname === '/entrypoint';

  const areCookiesAccepted = request.cookies.has(Cookie.CONVENIAT_COOKIE_BANNER);

  const shouldRedirectToEntrypoint = !isAtEntrypointPage && isInAppDesign && !areCookiesAccepted;
  if (shouldRedirectToEntrypoint) {
    return NextResponse.redirect(new URL('/entrypoint', request.url));
  }

  const shouldRedirectToAppLandingPage = isAtEntrypointPage && isInAppDesign && areCookiesAccepted;
  if (shouldRedirectToAppLandingPage) {
    return NextResponse.redirect(new URL('/app/dashboard', request.url));
  }
  return middleware(request, event, response);
};

const applyMiddlewareForDisabledAppFeatures = (
  request: NextRequest,
  event: NextFetchEvent,
  response: NextResponse,
  middleware: ChainedMiddleware,
): NextMiddlewareResult | Promise<NextMiddlewareResult> => {
  const { pathname } = request.nextUrl;
  const isEntrypoint = pathname === '/entrypoint';

  const isAppPath = [...i18nConfig.locales, ''].some((locale) =>
    pathname.startsWith(`/${locale}/app`),
  );

  // clear cookie if set
  const isInAppDesign = request.cookies.has(Cookie.APP_DESIGN);
  if (isInAppDesign) response.cookies.delete(Cookie.APP_DESIGN);

  const shouldRewrite = isAppPath || isEntrypoint;
  if (shouldRewrite) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return middleware(request, event, response);
};

/**
 * Middleware to handle app features. This middleware checks if the app features are enabled and
 * applies the appropriate middleware logic.
 *
 * @param nextMiddleware
 */
export const withAppFeatureMiddleware = (nextMiddleware: ChainedMiddleware): ChainedMiddleware => {
  return (request, event, response) => {
    const areAppFeaturesEnabled = environmentVariables.FEATURE_ENABLE_APP_FEATURE === true;

    // initialize response if not already set
    response ??= NextResponse.next();

    // rewrite path to ${locale}/${designName}/rest-of-path
    const { pathname } = request.nextUrl;

    if (isExcludedFromPathRewrites(request)) {
      return nextMiddleware(request, event, response);
    }

    const designName =
      request.cookies.get(Cookie.APP_DESIGN)?.value === 'true'
        ? DesignCodes.APP_DESIGN
        : DesignCodes.WEB_DESIGN;
    if (!pathname.includes(DesignCodes.APP_DESIGN) && !pathname.includes(DesignCodes.WEB_DESIGN)) {
      const url = request.nextUrl.clone();

      // if url starts with /de, /fr, /it, /en, we need to insert designName after the locale
      // otherwise, we insert designName at the beginning of the path
      const pathnameWithTrailingSlash = pathname.endsWith('/') ? pathname : `${pathname}/`;
      if (
        i18nConfig.locales.some((locale) => pathnameWithTrailingSlash.startsWith(`/${locale}/`))
      ) {
        const firstSegment = pathname.split('/')[1] ?? '';
        url.pathname = `/${firstSegment}/${designName}${pathname.slice(Math.max(0, firstSegment.length + 1))}`;
      } else {
        url.pathname = `/de/${designName}${pathname}`;
      }

      const cookies = response.cookies;
      response = NextResponse.rewrite(url, {
        request,
      });
      for (const cookie of cookies.getAll()) {
        response.cookies.set(cookie.name, cookie.value);
      }
    }

    if (areAppFeaturesEnabled) {
      return applyMiddlewareForAppFeatures(request, event, response, nextMiddleware);
    }

    return applyMiddlewareForDisabledAppFeatures(request, event, response, nextMiddleware);
  };
};
