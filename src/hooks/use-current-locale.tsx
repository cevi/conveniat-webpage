'use client';

import { useCurrentLocale as useLocaleFromCookieOrPath } from 'next-i18n-router/client';
import type { Config } from 'next-i18n-router/dist/types';
import type React from 'react';
import { createContext, useContext, type ReactNode } from 'react';

const RouteLocaleContext = createContext<string | undefined>(undefined);

/**
 * Hands the locale the proxy resolved for this request to every client component below.
 */
export const RouteLocaleProvider: React.FC<{ locale: string; children: ReactNode }> = ({
  locale,
  children,
}) => <RouteLocaleContext.Provider value={locale}>{children}</RouteLocaleContext.Provider>;

/**
 * The locale of the page being rendered.
 *
 * `next-i18n-router` reads the locale cookie in the browser and only the pathname on the server.
 * The proxy serves a prefix-less URL in the locale of the cookie, so for `/app/schedule` with a
 * French cookie the server would render German and the browser French, and hydration fails. The
 * route's own locale is the same on both sides; the cookie and the pathname only decide outside
 * of the `[locale]` layout, on the login page and in the admin panel.
 */
export const useCurrentLocale = (config: Config): string | undefined => {
  const routeLocale = useContext(RouteLocaleContext);
  const localeFromCookieOrPath = useLocaleFromCookieOrPath(config);
  return routeLocale ?? localeFromCookieOrPath;
};
