/**
 * Rules for the range of consecutive days a helper marks in a `dateSlotSelection` form
 * block.
 *
 * Lives outside the React component because the server checks a submitted range against
 * the very same rules in `validateFormSubmission`. Both sides must agree on the value
 * format, so keep them reading from here.
 */

const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * Separates start and end day in the stored value. Deliberately not localized: the value
 * ends up verbatim in the submission, the CSV export and the PDF report, and those must
 * not read differently depending on the locale the helper filled the form in.
 */
export const DATE_SLOT_VALUE_SEPARATOR = ' – ';

/** Fallback minimum range length, in days, when an editor leaves the field empty. */
export const DEFAULT_MINIMUM_DAYS = 3;

const ISO_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface DateRangeConfiguration {
  startDate?: string | null | undefined;
  endDate?: string | null | undefined;
  minDays?: number | null | undefined;
  maxDays?: number | null | undefined;
}

export interface SelectableDays {
  /** First day a range may start on, as `YYYY-MM-DD`. */
  firstDay: string;
  /** Last day a range may end on, as `YYYY-MM-DD`. */
  lastDay: string;
  minDays: number;
  /** Undefined when any length up to the last day is fine. */
  maxDays: number | undefined;
}

export interface DateRange {
  /** Inclusive first day, as `YYYY-MM-DD`. */
  startDate: string;
  /** Inclusive last day, as `YYYY-MM-DD`. */
  endDate: string;
}

/**
 * Rounds a Payload date to the UTC start of the day it denotes.
 *
 * Payload stores a date field as an instant, and the admin panel picks that instant in the
 * editor's own time zone, so `12.07.2027` arrives as `2027-07-11T22:00:00.000Z` from a
 * CEST browser. Rounding rather than truncating keeps such a value on the day the editor
 * saw in the picker, for every offset within ±12 hours.
 */
const toUtcDayStart = (value: string | null | undefined): number | undefined => {
  if (typeof value !== 'string' || value === '') return undefined;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return undefined;
  return Math.round(parsed / MILLISECONDS_PER_DAY) * MILLISECONDS_PER_DAY;
};

/** Formats a UTC timestamp as `YYYY-MM-DD`. */
export const toIsoDay = (timestamp: number): string =>
  new Date(timestamp).toISOString().slice(0, 10);

/** Parses a strict `YYYY-MM-DD`, rejecting impossible days like `2027-02-30`. */
const isoDayToTimestamp = (isoDay: string): number | undefined => {
  if (!ISO_DAY_PATTERN.test(isoDay)) return undefined;
  const parsed = Date.parse(`${isoDay}T00:00:00.000Z`);
  if (Number.isNaN(parsed) || toIsoDay(parsed) !== isoDay) return undefined;
  return parsed;
};

/** Moves an ISO day by whole days; malformed input comes back unchanged. */
export const addDays = (isoDay: string, days: number): string => {
  const timestamp = isoDayToTimestamp(isoDay);
  return timestamp === undefined ? isoDay : toIsoDay(timestamp + days * MILLISECONDS_PER_DAY);
};

/** Inclusive number of days from `startDate` to `endDate`, or 0 for malformed input. */
export const countDays = (startDate: string, endDate: string): number => {
  const start = isoDayToTimestamp(startDate);
  const end = isoDayToTimestamp(endDate);
  if (start === undefined || end === undefined) return 0;
  return Math.round((end - start) / MILLISECONDS_PER_DAY) + 1;
};

const toOptionalPositiveInteger = (value: number | null | undefined): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const rounded = Math.floor(value);
  return rounded > 0 ? rounded : undefined;
};

/**
 * Resolves the window and length limits an editor configured.
 *
 * Returns undefined for an unusable configuration (missing or malformed dates, a window
 * shorter than the minimum) rather than throwing: drafts skip field validation, so the
 * renderer has to cope with a half-filled block.
 */
export const getSelectableDays = (
  configuration: DateRangeConfiguration,
): SelectableDays | undefined => {
  const first = toUtcDayStart(configuration.startDate);
  const last = toUtcDayStart(configuration.endDate);
  if (first === undefined || last === undefined || last < first) return undefined;

  const minDays = toOptionalPositiveInteger(configuration.minDays) ?? DEFAULT_MINIMUM_DAYS;
  const maxDaysSetting = toOptionalPositiveInteger(configuration.maxDays);
  // A maximum below the minimum would reject every range; a draft can hold one, so drop it.
  const maxDays =
    maxDaysSetting !== undefined && maxDaysSetting >= minDays ? maxDaysSetting : undefined;

  const firstDay = toIsoDay(first);
  const lastDay = toIsoDay(last);
  if (countDays(firstDay, lastDay) < minDays) return undefined;

  return { firstDay, lastDay, minDays, maxDays };
};

/** Builds the stable, locale-independent value stored in the submission. */
export const toDateRangeValue = (range: DateRange): string =>
  `${range.startDate}${DATE_SLOT_VALUE_SEPARATOR}${range.endDate}`;

/** Reads a stored value back, or undefined when it is not a well-formed range value. */
export const parseDateRangeValue = (value: unknown): DateRange | undefined => {
  if (typeof value !== 'string') return undefined;
  const [startDate, endDate, ...rest] = value.split(DATE_SLOT_VALUE_SEPARATOR);
  if (startDate === undefined || endDate === undefined || rest.length > 0) return undefined;
  if (isoDayToTimestamp(startDate) === undefined || isoDayToTimestamp(endDate) === undefined) {
    return undefined;
  }
  return { startDate, endDate };
};

/** Whether `range` lies inside the window and respects the configured length limits. */
export const isRangeAllowed = (range: DateRange, selectable: SelectableDays): boolean => {
  const length = countDays(range.startDate, range.endDate);
  return (
    range.startDate >= selectable.firstDay &&
    range.endDate <= selectable.lastDay &&
    length >= selectable.minDays &&
    (selectable.maxDays === undefined || length <= selectable.maxDays)
  );
};
