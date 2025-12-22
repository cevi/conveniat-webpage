import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { ProxyModule } from '@/proxy/types';
import type { Locale } from '@/types/types';
import { Cookie, Header } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
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
 * If no design is specified using the APP_MODE cookie or header, we rewrite to DesignCodes.WEB_DESIGN.
 * If a design is specified, we rewrite to that design.
 *
 * @param next
 */
export const designRewriteProxy: ProxyModule = (next) => async (request, event, response) => {
  const cookieDesign = request.cookies.get(Cookie.DESIGN_MODE)?.value;
  const headerDesign = request.headers.get(Header.DESIGN_MODE);

  // use the design of the  header first, then the cookie, then default to DesignCodes.WEB_DESIGN
  const designPrefix = headerDesign ?? cookieDesign ?? DesignCodes.WEB_DESIGN;
  response.headers.set(Header.DESIGN_MODE, designPrefix);

  const nextResponse = createPrefixedRewriteResponse({
    prefix: designPrefix,
    request,
    response,
  });
  return next(request, event, nextResponse);
};
