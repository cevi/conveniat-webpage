import { enabledLocales } from '@/features/payload-cms/payload-cms/locales';
import type { Locale } from '@/types/types';

/**
 * The native name of each language, as shown in the language switchers.
 */
export const languageNames: Record<Locale, string> = {
  de: 'Deutsch',
  fr: 'Français',
  en: 'English',
};

/**
 * The languages offered by this deployment, in display order.
 *
 * Driven by the `NEXT_PUBLIC_ENABLED_LOCALES` feature flag: conveniat27 ships all languages,
 * the konekta deployment only serves German and French.
 */
export const languageOptions: { value: Locale; label: string }[] = enabledLocales.map((locale) => ({
  value: locale,
  label: languageNames[locale],
}));
