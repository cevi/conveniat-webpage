import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { ProxyModule } from '@/proxy/types';
import { getLocaleFromUrl } from '@/proxy/utils/get-locale-from-url';
import type { Locale } from '@/types/types';
import { Cookie, Header, i18nConfig } from '@/types/types';
import { type NextRequest, NextResponse } from 'next/server';

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
export const localeReplacingRewrite = (config: {
  locale: string;
  request: NextRequest;
  response: NextResponse<unknown>;
}): NextResponse<unknown> => {
  const { locale, request, response } = config;

  const validLocales = new Set<string>(Object.values(LOCALE));
  const pathname = new URL(response.headers.get(Header.MIDDLEWARE_REWRITES) ?? request.url)
    .pathname;

  const segments = pathname.split('/').filter((segment) => segment.length > 0);
  const localeSegment = segments[0];
  const isValidLocaleSegment =
    localeSegment !== undefined && validLocales.has(localeSegment as Locale);

  const remainingSegments = isValidLocaleSegment ? segments.slice(1) : segments;

  const newPathname = `/${[locale, ...remainingSegments].join('/')}`;
  const newUrl = new URL(newPathname, request.url);
  newUrl.search = request.nextUrl.search;
  return NextResponse.rewrite(newUrl, response);
};

/**
 *
 * i18n Proxy Module
 *
 * This proxy module handles internationalization (i18n) routing by determining the appropriate
 * internal target using request rewrites based on the locale specified in the URL or cookies.
 *
 * Request rewrites have no effect on the visible URL in the browser; they only change the
 * internal path used to serve the request (`x-middleware-rewrite`).
 *
 * The resulting internal paths follow the structure: /{locale}/{original-path},
 * where {locale} is derived from either the URL prefix or a cookie, defaulting to the configured
 * default locale. If the URL contains a valid locale prefix, that locale is used. If not, the
 * locale from the cookie is used. If neither is present, the default locale is applied.
 *
 * Examples:
 *
 * We assume the default locale is `en` and supported locales are `en`, `fr`, and `de`.
 *
 *  - Request URL: `/fr/about` -> Internal Path Rewrite: `/fr/about`
 *  - Request URL: `/about` with cookie `NEXT_LOCALE=de` -> Internal Path Rewrite: `/de/about`
 *  - Request URL: `/about` with no locale cookie -> Internal Path Rewrite: `/en/about`
 *  - Request URL: `/de/contact` -> Internal Path Rewrite: `/de/contact`
 *  - Request URL: `/en/home` -> Redirect to `/home` (default locale dropped)
 *
 * @param next
 */
export const i18nProxy: ProxyModule = (next) => async (request, event, response) => {
  const cookieLocale = request.cookies.get(i18nConfig.localeCookie)?.value as Locale | undefined;
  const urlLocale = getLocaleFromUrl(request, response);
  const locale = urlLocale ?? cookieLocale ?? i18nConfig.defaultLocale;

  if (urlLocale === i18nConfig.defaultLocale) {
    // drop the locale prefix for default locale and redirect
    const urlWithoutDefaultLocale = new URL(request.url);
    urlWithoutDefaultLocale.pathname = urlWithoutDefaultLocale.pathname.replace(
      `/${i18nConfig.defaultLocale}`,
      '',
    );
    urlWithoutDefaultLocale.search = request.nextUrl.search;
    urlWithoutDefaultLocale.hash = request.nextUrl.hash;

    const redirectResponse = NextResponse.redirect(urlWithoutDefaultLocale);
    redirectResponse.cookies.set(Cookie.LOCALE_COOKIE, locale, {});
    return redirectResponse;
  }

  const nextResponse = localeReplacingRewrite({
    locale,
    request,
    response,
  });
  nextResponse.cookies.set(Cookie.LOCALE_COOKIE, locale, {});
  return next(request, event, nextResponse);
};
