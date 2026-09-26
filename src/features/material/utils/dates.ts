const pad = (value: number): string => String(value).padStart(2, '0');

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

/** Today and tomorrow, the usual answer to "from when until when". */
export const defaultPeriod = (): { start: string; end: string } => {
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  return { start: toDateInput(today), end: toDateInput(tomorrow) };
};
