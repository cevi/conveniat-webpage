/**
 * Generation of the selectable multi-day availability slots of a `dateSlotSelection`
 * form block.
 *
 * Lives outside the React component because the server re-generates the very same list
 * in `validateFormSubmission` to check that a submitted slot is one the editor actually
 * offered. Both sides must agree on the value format, so keep them reading from here.
 */

const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * Separates start and end day in the stored value. Deliberately not localized: the value
 * ends up verbatim in the submission, the CSV export and the PDF report, and those must
 * not read differently depending on the locale the helper filled the form in.
 */
export const DATE_SLOT_VALUE_SEPARATOR = ' – ';

/** Fallback slot length, in days, when an editor leaves the field empty. */
export const DEFAULT_SLOT_LENGTH_IN_DAYS = 3;

/**
 * Upper bound on the number of generated slots. A camp lasts weeks, so a block producing
 * more than this means the editor mistyped a date — rendering ten thousand cards would
 * take the page down instead of showing them their typo.
 */
const MAXIMUM_SLOTS = 200;

export interface DateSlot {
  /** Inclusive first day of the slot, as `YYYY-MM-DD`. */
  startDate: string;
  /** Inclusive last day of the slot, as `YYYY-MM-DD`. */
  endDate: string;
  /** Stable, locale-independent value stored in the submission. */
  value: string;
}

export interface DateSlotConfiguration {
  startDate?: string | null | undefined;
  endDate?: string | null | undefined;
  slotLength?: number | null | undefined;
  stepDays?: number | null | undefined;
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

const toIsoDay = (timestamp: number): string => new Date(timestamp).toISOString().slice(0, 10);

const toPositiveInteger = (value: number | null | undefined, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const rounded = Math.floor(value);
  return rounded > 0 ? rounded : fallback;
};

/**
 * Builds every slot of `slotLength` consecutive days that fits between the configured
 * start and end day, moving forward by `stepDays` between slots.
 *
 * Returns an empty list for an unusable configuration (missing or malformed dates, a range
 * shorter than one slot) rather than throwing: drafts skip field validation, so the
 * renderer has to cope with a half-filled block.
 */
export const generateDateSlots = (configuration: DateSlotConfiguration): DateSlot[] => {
  const firstDay = toUtcDayStart(configuration.startDate);
  const lastDay = toUtcDayStart(configuration.endDate);
  if (firstDay === undefined || lastDay === undefined || lastDay < firstDay) return [];

  const slotLength = toPositiveInteger(configuration.slotLength, DEFAULT_SLOT_LENGTH_IN_DAYS);
  const stepDays = toPositiveInteger(configuration.stepDays, 1);
  const slotSpan = (slotLength - 1) * MILLISECONDS_PER_DAY;

  const slots: DateSlot[] = [];
  for (
    let slotStart = firstDay;
    slotStart + slotSpan <= lastDay && slots.length < MAXIMUM_SLOTS;
    slotStart += stepDays * MILLISECONDS_PER_DAY
  ) {
    const startDate = toIsoDay(slotStart);
    const endDate = toIsoDay(slotStart + slotSpan);
    slots.push({
      startDate,
      endDate,
      value: `${startDate}${DATE_SLOT_VALUE_SEPARATOR}${endDate}`,
    });
  }

  return slots;
};
