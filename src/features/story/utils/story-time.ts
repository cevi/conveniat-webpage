import type { Locale } from '@/types/types';
import { campClockOf } from '@/utils/camp-clock';

const LOCALE_TAGS: Record<Locale, string> = { de: 'de-CH', en: 'en-GB', fr: 'fr-CH' };

/** The camp day (`YYYY-MM-DD`, Europe/Zurich) of a stored date, or `undefined` for none. */
export const storyDayKeyOf = (value: string | null | undefined): string | undefined => {
  if (typeof value !== 'string' || value === '') return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : campClockOf(date).dayKey;
};

/** "So., 25. Juli" for a camp day. */
export const formatStoryDay = (dayKey: string, locale: Locale): string => {
  const [year = 0, month = 1, day = 1] = dayKey.split('-').map(Number);
  // noon UTC is the same calendar day in Zurich all year
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Zurich',
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
};

/** "So., 25.7., 21:15" on the camp's clock, for a moment like "visible from". */
export const formatStoryMoment = (value: string, locale: Locale): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Zurich',
  }).format(date);
};

/** "21:15" on the camp's clock. */
export const formatStoryTime = (value: string, locale: Locale): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Zurich',
  }).format(date);
};

/** "SA" and "24" for the date column of a list of days. */
export const storyDayParts = (dayKey: string, locale: Locale): { weekday: string; day: string } => {
  const [year = 0, month = 1, day = 1] = dayKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const weekday = new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    weekday: 'short',
    timeZone: 'Europe/Zurich',
  })
    .format(date)
    .replace('.', '');
  return { weekday, day: String(day) };
};
