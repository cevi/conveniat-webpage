import type { Locale } from '@/types/types';

/**
 * Narrows Payload's admin locale code to one the static translation tables cover.
 *
 * `useLocale().code` can be `all`, or a locale this deployment does not serve. German is
 * the primary language of this admin panel, so it is the fallback.
 */
export const resolveAdminLocale = (code: string): Locale => {
  if (code === 'de' || code === 'en' || code === 'fr') return code;
  return 'de';
};
