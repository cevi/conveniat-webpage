const pad = (value: number): string => String(value).padStart(2, '0');

/**
 * The last day of conveniat27, offered as the "until the end of the camp" return date. It is
 * only a suggestion, the date picker takes any day; once konekta lends material for another
 * camp, this belongs into an env value.
 */
export const CAMP_END = '2027-07-31';

/** A date as the `YYYY-MM-DD` a date input wants, in the reader's time zone. */
export const toDateInput = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/**
 * Reads a date input. A loan starts at the beginning of its first day and ends at the end of
 * its last one, so a loan due today only turns overdue after midnight.
 */
export const fromDateInput = (value: string, edge: 'start' | 'end'): Date | undefined => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [, year, month, day] = match.map(Number) as [number, number, number, number];
  return edge === 'start'
    ? new Date(year, month - 1, day, 0, 0, 0, 0)
    : new Date(year, month - 1, day, 23, 59, 59, 999);
};

/** The day after `date`, as a date input, the usual answer to "until when". */
export const nextDayInput = (date: Date): string =>
  toDateInput(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1));
