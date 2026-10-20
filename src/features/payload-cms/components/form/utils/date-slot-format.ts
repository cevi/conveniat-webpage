import type { DateRange } from '@/features/payload-cms/components/form/utils/date-slots';
import { countDays } from '@/features/payload-cms/components/form/utils/date-slots';
import type { Locale, StaticTranslationString } from '@/types/types';

/**
 * How a helper's marked days read to people: in the calendar's summary and in the
 * confirmation mail. Both use these, so the mail repeats exactly what the helper saw.
 */

const dayCountSuffix: StaticTranslationString = {
  de: 'Tage',
  en: 'days',
  fr: 'jours',
};

const dayCountSuffixSingular: StaticTranslationString = {
  de: 'Tag',
  en: 'day',
  fr: 'jour',
};

const shortDate: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
};

/**
 * Formats an ISO day in the reader's locale.
 *
 * The day is parsed back through `Date.UTC` rather than `new Date(iso)` so the rendered day
 * never slips by one for readers west of UTC.
 */
export const formatIsoDay = (
  isoDay: string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions,
): string => {
  const [year, month, day] = isoDay.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) return isoDay;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(locale, {
    ...options,
    timeZone: 'UTC',
  });
};

/** `9 Tage`, `1 Tag`. */
export const formatDayCount = (days: number, locale: Locale): string =>
  `${days} ${days === 1 ? dayCountSuffixSingular[locale] : dayCountSuffix[locale]}`;

/** `Do., 15.07.2027 – Fr., 23.07.2027` */
export const formatRangeDates = (range: DateRange, locale: Locale): string =>
  `${formatIsoDay(range.startDate, locale, shortDate)} – ${formatIsoDay(range.endDate, locale, shortDate)}`;

/** `Do., 15.07.2027 – Fr., 23.07.2027 · 9 Tage` */
export const formatRange = (range: DateRange, locale: Locale): string =>
  `${formatRangeDates(range, locale)} · ${formatDayCount(countDays(range.startDate, range.endDate), locale)}`;
