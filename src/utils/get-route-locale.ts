import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { locale as rootLocaleGetter } from 'next/root-params';

// `next typegen` strips route groups, takes `(payload)/layout.tsx` for a layout at `/` above
// `[locale]/[design]`, and generates no root params for us. Next's bare fallback declaration then
// types the module as `any`. At runtime the getter exists (Next 16.4.3), so give it its real shape.
const rootLocale = rootLocaleGetter as () => Promise<string | undefined>;

/**
 * The locale of the page being rendered, read from the `[locale]` segment of the root layout.
 * Use it in Server Components under `src/app/(frontend)/[locale]/[design]`, where the URL is what
 * decides the language. Everywhere root params do not reach (Client Components, tRPC, Route
 * Handlers and the other root layouts), keep `getLocaleFromCookies()`.
 *
 * The root layout already answers an unknown locale with a 404. The check here is still needed
 * because the other root layouts have no `[locale]`, which makes the getter `string | undefined`.
 */
export const getRouteLocale = async (): Promise<Locale> => {
  const rawLocale = await rootLocale();
  if (rawLocale !== undefined && i18nConfig.locales.includes(rawLocale)) {
    return rawLocale as Locale;
  }
  return i18nConfig.defaultLocale as Locale;
};
