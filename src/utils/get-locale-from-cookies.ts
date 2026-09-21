import 'server-only';

import type { Locale } from '@/types/types';
import { Cookie, i18nConfig } from '@/types/types';
import { cookies } from 'next/headers';

/**
 * This function is responsible for fetching the locale from the cookies within a server-side
 * function or server-component. This function is only available on the server-side.
 *
 * If the locale is not set, the default locale is returned.
 **
 */
export const getLocaleFromCookies = async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get(Cookie.LOCALE_COOKIE)?.value;

  // The cookie is client-controlled and outlives a change to the enabled locales, so it can name
  // a locale this deployment does not serve. Payload is configured with `fallback: false` and
  // would happily read that locale, surfacing content the route is not supposed to show.
  if (rawLocale !== undefined && i18nConfig.locales.includes(rawLocale)) {
    return rawLocale as Locale;
  }

  return i18nConfig.defaultLocale as Locale;
};
