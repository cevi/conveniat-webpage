import type { Locale } from '@/types/types';
import { Cookie, i18nConfig } from '@/types/types';
import { cookies } from 'next/headers';
import { locale as getRootLocale } from 'next/root-params';
import 'server-only';

/**
 * This function is responsible for fetching the locale in a server-side function or server-component.
 * It first attempts to use Next.js 16.3 `next/root-params` (`locale()`). If outside a root-params scope
 * or if parsing fails, it falls back to checking the request cookies and default locale.
 */
export const getLocaleFromCookies = async (): Promise<Locale> => {
  try {
    const getRootLocaleFunction = getRootLocale as () => Promise<string | undefined>;
    const rootLocale = (await getRootLocaleFunction()) as Locale | undefined;
    if (rootLocale !== undefined && ['de', 'fr', 'en'].includes(rootLocale)) {
      return rootLocale;
    }
  } catch {
    // Outside root-params context
  }

  const cookieStore = await cookies();
  let locale = cookieStore.get(Cookie.LOCALE_COOKIE)?.value as Locale | undefined;
  locale ??= i18nConfig.defaultLocale as Locale;
  return locale;
};

export const getLocale = getLocaleFromCookies;
