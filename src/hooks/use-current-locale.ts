'use client';

import { useCurrentLocale as useLocaleFromCookieOrPath } from 'next-i18n-router/client';
import type { Config } from 'next-i18n-router/dist/types';
import { useParams } from 'next/navigation';

/**
 * The locale of the page being rendered.
 *
 * `next-i18n-router` reads the locale cookie in the browser and only the pathname on the server.
 * The proxy serves a prefix-less URL in the locale of the cookie, so for `/app/schedule` with a
 * French cookie the server would render German and the browser French, and hydration fails. The
 * `[locale]` param is the one the proxy rewrote to, the same on both sides; the cookie and the
 * pathname only decide outside of that segment, on the login page and in the admin panel.
 */
export const useCurrentLocale = (config: Config): string | undefined => {
  const { locale: routeLocale } = useParams<{ locale?: string }>();
  const localeFromCookieOrPath = useLocaleFromCookieOrPath(config);
  return routeLocale ?? localeFromCookieOrPath;
};
