import type { Locale } from '@/types/types';

const INTL_LOCALE: Record<Locale, string> = { de: 'de-CH', fr: 'fr-CH', en: 'en-GB' };

/** A Besuchstag as people read it, e.g. "Mittwoch, 28. Juli 2027", from its `YYYY-MM-DD`. */
export const formatVisitDay = (day: string, locale: Locale): string =>
  new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    // the day is a calendar day, kept at midnight UTC so no timezone moves it
    timeZone: 'UTC',
  }).format(new Date(`${day}T00:00:00.000Z`));
