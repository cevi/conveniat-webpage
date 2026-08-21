import type { Locale } from 'payload';

const DE = 'de' as const;
const FR = 'fr' as const;
const EN = 'en' as const;
export const LOCALE = { DE, FR, EN };

export type LocaleCode = (typeof LOCALE)[keyof typeof LOCALE];

/**
 * Every locale the code base knows about.
 *
 * This list is intentionally static: it defines the `Locale` type and therefore the shape of all
 * localized content. Which of these locales a given deployment actually serves is a separate,
 * configurable question — see `enabledLocales` below.
 */
const allLocaleCodes: LocaleCode[] = Object.values(LOCALE);

const allLocales: Locale[] = [
  {
    label: {
      en: 'English',
      de: 'Englisch',
      fr: 'Anglais',
    },
    code: LOCALE.EN,
  },
  {
    label: {
      en: 'German',
      de: 'Deutsch',
      fr: 'Allemand',
    },
    code: LOCALE.DE,
  },
  {
    label: {
      en: 'French',
      de: 'Französisch',
      fr: 'Français',
    },
    code: LOCALE.FR,
  },
];

/**
 * Parses the `NEXT_PUBLIC_ENABLED_LOCALES` feature flag (a comma separated list of locale codes).
 *
 * conveniat27 ships all locales, the konekta deployment only serves German and French. Unknown
 * codes are ignored, and the default locale (German) is always kept: it is the fallback locale
 * for content resolution and the prefix-less locale of the router, so a deployment without it
 * would not be able to serve a single page.
 */
const parseEnabledLocaleCodes = (raw: string | undefined): LocaleCode[] => {
  if (raw === undefined || raw.trim() === '') return allLocaleCodes;

  const requested = new Set(raw.split(',').map((code) => code.trim().toLowerCase()));
  const enabled = allLocaleCodes.filter((code) => code === LOCALE.DE || requested.has(code));

  return enabled;
};

/**
 * Read directly from `process.env` instead of going through `@/config/environment-variables`:
 * this module is pulled into the proxy (middleware) bundle and into the `Locale` type, so it
 * must stay free of heavier runtime dependencies.
 *
 * `NEXT_PUBLIC_` prefixed variables are inlined at build time, which is what we want here — the
 * language switchers are client components, so a server-only value would cause a hydration
 * mismatch between the rendered and the hydrated markup.
 */
// eslint-disable-next-line n/no-process-env
const rawEnabledLocales = process.env['NEXT_PUBLIC_ENABLED_LOCALES'];

/**
 * The locale codes this deployment serves, in display order.
 */
export const enabledLocales: LocaleCode[] = parseEnabledLocaleCodes(rawEnabledLocales);

const isEnabled = (code: string): boolean => enabledLocales.includes(code as LocaleCode);

/**
 * The Payload CMS localization config, restricted to the locales this deployment serves.
 */
export const locales: Locale[] = allLocales.filter((locale) => isEnabled(locale.code));
