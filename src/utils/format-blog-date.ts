import type { Locale } from '@/types/types';
import { format } from 'date-fns';
import { de, enUS, fr } from 'date-fns/locale';

const localeMap = {
  de: de,
  en: enUS,
  fr: fr,
} as const;

export const formatBlogDate = (dateString: string, locale: Locale): string => {
  const date = new Date(dateString);
  const dateLocale = localeMap[locale] || enUS;

  // Format according to the Figma design: "Freitag, 21. März 2025, 18.00 Uhr"
  // Different format for each locale
  switch (locale) {
    case 'de':
      return format(date, "EEEE, d. MMMM yyyy, HH.mm 'Uhr'", { locale: dateLocale });
    case 'fr':
      return format(date, 'EEEE d MMMM yyyy, HH:mm', { locale: dateLocale });
    case 'en':
      return format(date, 'EEEE, MMMM d, yyyy, HH:mm', { locale: dateLocale });
    default:
      return format(date, 'EEEE, MMMM d, yyyy, HH:mm', { locale: enUS });
  }
};
