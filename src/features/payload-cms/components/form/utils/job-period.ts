import type { SelectableDays } from '@/features/payload-cms/components/form/utils/date-slots';
import { getSelectableDays } from '@/features/payload-cms/components/form/utils/date-slots';

/**
 * A helper job with a minimum duration does not ask for its whole window: the helper picks
 * their own consecutive days within it, at least that many. The days are a second answer of
 * the job selection, stored under its name with this suffix, so a mail can show them as
 * `{{jobhauptlager_zeitraum}}`.
 *
 * Shared by the form, the server check and the mail, which must agree on the name and on
 * the rules. A field name only holds `[a-z0-9_]`, so the suffix reads like one an editor
 * would write.
 */
export const JOB_PERIOD_FIELD_SUFFIX = '_zeitraum';

/** The answer that holds the days a helper picked for the job chosen in `jobFieldName`. */
export const getJobPeriodFieldName = (jobFieldName: string): string =>
  `${jobFieldName}${JOB_PERIOD_FIELD_SUFFIX}`;

interface JobWithPeriod {
  dateRange?: { startDate?: string | null; endDate?: string | null } | null;
  minDays?: number | null;
}

/**
 * The camp day a job date denotes, as `YYYY-MM-DD`.
 *
 * The admin panel stores a job's day at noon UTC, which the rounding of a form's own window
 * would carry into the next day. Read in the camp's time zone, noon UTC and the editor's
 * local midnight both stay on the day the editor picked.
 */
const toCampDay = (value: string | null | undefined): string | undefined => {
  if (typeof value !== 'string' || value === '') return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' });
};

/**
 * The days a helper may pick for a job, or undefined when the job lasts its whole window.
 * A draft can leave the window shorter than the minimum, which also comes back undefined.
 */
export const getJobSelectableDays = (job: JobWithPeriod): SelectableDays | undefined => {
  if (typeof job.minDays !== 'number' || job.minDays < 1) return undefined;
  return getSelectableDays({
    startDate: toCampDay(job.dateRange?.startDate),
    endDate: toCampDay(job.dateRange?.endDate),
    minDays: job.minDays,
    maxRanges: 1,
  });
};
