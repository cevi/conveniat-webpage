import 'server-only';

import { i18nConfig, Locale } from '@/types';
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
  let locale = cookieStore.get('NEXT_LOCALE')?.value as Locale | undefined;
  locale ??= i18nConfig.defaultLocale as Locale;
  return locale;
};
