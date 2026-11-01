import { format } from 'date-fns';
import { de, enUS, fr } from 'date-fns/locale';

const DATE_FNS_LOCALES = { de, fr, en: enUS } as const;
const THIS_YEAR_PATTERNS = { de: 'd. MMM', fr: 'd MMM', en: 'MMM d' } as const;
const OLDER_PATTERNS = { de: 'dd.MM.yy', fr: 'dd/MM/yy', en: 'M/d/yy' } as const;

/**
 * The date beside a chat in the list: the time for today, "12. Okt." for this year and
 * "12.10.25" for an older one. Empty for a date it cannot read.
 *
 * @param timestamp - when the last message was sent
 * @param locale - the language of the month name
 * @param now - today, from the caller so the function stays pure
 */
export const formatChatListDate = (timestamp: Date | string, locale: string, now: Date): string => {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const key = locale === 'de' || locale === 'fr' ? locale : 'en';
  const options = { locale: DATE_FNS_LOCALES[key] };
  const isSameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (isSameDay) return format(date, 'HH:mm', options);
  if (date.getFullYear() === now.getFullYear()) {
    return format(date, THIS_YEAR_PATTERNS[key], options);
  }
  return format(date, OLDER_PATTERNS[key], options);
};
