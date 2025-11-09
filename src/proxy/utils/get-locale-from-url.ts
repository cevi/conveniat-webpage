import type { Locale } from '@/types/types';
import { Header, i18nConfig } from '@/types/types';
import type { NextRequest, NextResponse } from 'next/server';

/**
 * Get locale from URL pathname segment, if present and valid. Prefers rewritten URL if present,
 * else fallback to the original request URL. Returns undefined if no valid locale is found
 * (this method does not fall back to default locale).
 *
 * @param request - NextRequest
 * @param response - NextResponse
 */
export const getLocaleFromUrl = (
  request: NextRequest,
  response: NextResponse,
): Locale | undefined => {
  const rewriteUrl = response.headers.get(Header.MIDDLEWARE_REWRITES);
  const url = rewriteUrl === null ? new URL(request.url) : new URL(rewriteUrl);

  const localeSegment = url.pathname.split('/').find((segment) => segment.length > 0);
  const validLocales = new Set<string>(Object.values(i18nConfig.locales));
  if (localeSegment !== undefined && validLocales.has(localeSegment as Locale)) {
    return localeSegment as Locale;
  }

  return undefined;
};
