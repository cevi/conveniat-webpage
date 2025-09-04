import type { Locale } from '@/types/types';

/**
 * Format date and time for schedule displays
 *
 * @param locale - Locale string (e.g., 'en-US', 'de-DE')
 * @param date - Date string in ISO format
 * @param time - Time string
 * @returns Object with formatted date and the original time
 */
export const formatScheduleDateTime = (
  locale: Locale,
  date: string,
  time: string,
): {
  formattedDate: string;
  time: string;
} => {
  const dateObject = new Date(date);
  const formattedDate = dateObject.toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return { formattedDate, time };
};
