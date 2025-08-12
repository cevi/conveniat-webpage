import type { Locale } from '@/types/types';
import { format } from 'date-fns';
import { de, enGB, fr } from 'date-fns/locale';

const localeMap = {
  de: de,
  en: enGB,
  fr: fr,
} as const;

export const formatBlogDate = (dateString: string, locale: Locale): string => {
  const date = new Date(dateString);
  const dateLocale = localeMap[locale];

  switch (locale) {
    case 'de': {
      return format(date, "EEEE, d. MMMM yyyy, HH.mm 'Uhr'", { locale: dateLocale });
    }
    case 'fr': {
      return format(date, 'EEEE d MMMM yyyy, HH:mm', { locale: dateLocale });
    }
    case 'en': {
      return format(date, 'EEEE, MMMM d, yyyy, HH:mm', { locale: dateLocale });
    }
  }
};
