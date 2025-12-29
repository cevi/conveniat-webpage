import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { ProxyModule } from '@/proxy/types';
import type { Locale } from '@/types/types';
import { Cookie, Header } from '@/types/types';
import { DesignCodes, DesignModeTriggers } from '@/utils/design-codes';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Adds a prefix to the rewrite URL in the response.
 *
 * Example: If the rewrite URL is "/about" and the prefix is "de",
 * the resulting rewrite URL will be "/de/about".
 *
 *
 * @returns A new NextResponse with the modified rewrite URL
 *
 * @param config - Configuration object
 * @param config.prefix - The prefix to add to the rewrite URL
 * @param config.request - The original NextRequest
 * @param config.response - The original NextResponse
 */
export const createPrefixedRewriteResponse = (config: {
  prefix: string;
  request: NextRequest;
  response: NextResponse<unknown>;
}): NextResponse<unknown> => {
  const { prefix, request, response } = config;

  const validLocales = new Set<string>(Object.values(LOCALE));
  const pathname = new URL(response.headers.get(Header.MIDDLEWARE_REWRITES) ?? request.url)
    .pathname;

  const segments = pathname.split('/').filter((segment) => segment.length > 0);
  const localeSegment = segments[0];
  const isValidLocaleSegment =
    localeSegment !== undefined && validLocales.has(localeSegment as Locale);

  const remainingSegments = isValidLocaleSegment ? segments.slice(1) : segments;
  const prefixSegments = isValidLocaleSegment ? [segments[0]] : [];

  const newPathname = `/${[...prefixSegments, prefix, ...remainingSegments].join('/')}`;
  const newUrl = new URL(newPathname, request.url);
  newUrl.search = request.nextUrl.search;
  return NextResponse.rewrite(newUrl, response);
};

/**
 * Design rewrite proxy
 *
 * Determines the design mode (App or Web) based on specific triggers:
 *
 * 1. **Explicit Mode (Cookie-based)**:
 *    - Trigger: `force-app-mode=true` query param.
 *    - Action: Sets `Usage.DESIGN_MODE` cookie to `APP_DESIGN`. Persists across sessions.
 *    - Use case: Desktop development, back-office forcing.
 *
 * 2. **Implicit Mode (Stateless from Proxy perspective)**:
 *    - Trigger: `x-app-mode: true` header (injected by Service Worker) OR `app-mode=true` query param.
 *    - Action: Uses `APP_DESIGN` for the current request only.
 *    - Use case: PWA Standalone mode (isolated per client by Service Worker).
 *
 * Default: `DesignCodes.WEB_DESIGN` if no triggers are present.
 *
 * @param next
 */
export const designRewriteProxy: ProxyModule = (next) => async (request, event, response) => {
  const headerDesign = request.headers.get(Header.DESIGN_MODE);
  const cookieDesign = request.cookies.get(Cookie.DESIGN_MODE)?.value;

  const initialAppModeCookie = request.cookies.get('x-app-mode-initial')?.value === 'true';

  const forceAppMode =
    request.nextUrl.searchParams.get(DesignModeTriggers.QUERY_PARAM_FORCE) === 'true';
  const implicitAppMode =
    request.nextUrl.searchParams.get(DesignModeTriggers.QUERY_PARAM_IMPLICIT) === 'true' ||
    request.headers.get(DesignModeTriggers.HEADER_IMPLICIT) === 'true' ||
    initialAppModeCookie;

  const pathname = new URL(response.headers.get(Header.MIDDLEWARE_REWRITES) ?? request.url)
    .pathname;
  const isOfflinePage = pathname.endsWith('/~offline');

  let designPrefix = headerDesign ?? cookieDesign ?? DesignCodes.WEB_DESIGN;

  if (forceAppMode || implicitAppMode || isOfflinePage) {
    designPrefix = DesignCodes.APP_DESIGN;
  }

  // use the design of the  header first, then the cookie, then default to DesignCodes.WEB_DESIGN
  response.headers.set(Header.DESIGN_MODE, designPrefix);

  const nextResponse = createPrefixedRewriteResponse({
    prefix: designPrefix,
    request,
    response,
  });

  // Set transient cookie on initial PWA entry to handle subresources before SW takes over
  if (request.nextUrl.searchParams.get(DesignModeTriggers.QUERY_PARAM_IMPLICIT) === 'true') {
    nextResponse.cookies.set('x-app-mode-initial', 'true', {
      path: '/',
      sameSite: 'lax',
      // No expiry means it's a session cookie
    });
  }

  if (forceAppMode) {
    console.log('[DesignProxy] Force Mode: Detected in URL');
  }

  return next(request, event, nextResponse);
};
