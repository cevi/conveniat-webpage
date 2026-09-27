import {
  DUE_SOON_DAYS,
  type HofEntryMode,
  type HofEntryStatus,
} from '@/features/hof-dashboard/constants';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The camp runs on Swiss time, so a deadline ends at midnight in Zurich wherever it is read. */
const CAMP_TIME_ZONE = 'Europe/Zurich';

const calendarDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: CAMP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Milliseconds of the calendar day `date` falls on in Zurich, as midnight UTC of that date. */
const dayStart = (date: Date): number => {
  const [year, month, day] = calendarDay.format(date).split('-').map(Number);
  return Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1);
};

/**
 * Whole days from `now` until the deadline, counted in Zurich calendar days: 0 on the day
 * itself, negative once it has passed.
 */
export const daysUntil = (deadline: string, now: Date): number =>
  Math.round((dayStart(new Date(deadline)) - dayStart(now)) / DAY_MS);

export type SubmissionState = 'done' | 'open' | 'dueSoon' | 'overdue';

/** What the Hof still has to do for a form: hand it in, or revise what it handed in. */
export type SubmissionGap = 'missing' | 'revision';

export interface SubmissionProgressInput {
  mode: HofEntryMode;
  deadline: string | undefined;
  /** The statuses of the Hof's submissions of the form, newest first. */
  statuses: readonly HofEntryStatus[];
}

export interface SubmissionProgress {
  state: SubmissionState;
  gap: SubmissionGap | undefined;
  /** Where the newest submission stands, if there is one. */
  status: HofEntryStatus | undefined;
  deadline: string | undefined;
  daysLeft: number | undefined;
}

const findGap = ({ mode, statuses }: SubmissionProgressInput): SubmissionGap | undefined => {
  if (statuses.length === 0) return 'missing';
  // of versions only the newest counts; of entries each one the Ressort sent back
  const revise =
    mode === 'versions'
      ? statuses[0] === 'revisionRequired'
      : statuses.includes('revisionRequired');
  return revise ? 'revision' : undefined;
};

/**
 * Where a Hof stands with one form: handed in, or how urgently something is missing. A form is
 * done once the Hof handed it in and the Ressort has not sent it back for a revision; what is
 * missing is due soon within two weeks of the form's due date, and overdue after it.
 */
export const getSubmissionProgress = (
  input: SubmissionProgressInput,
  now: Date,
): SubmissionProgress => {
  const gap = findGap(input);
  const { deadline } = input;
  const daysLeft = deadline === undefined ? undefined : daysUntil(deadline, now);
  const base = { gap, status: input.statuses[0], deadline, daysLeft };

  if (gap === undefined) return { state: 'done', ...base };
  if (daysLeft === undefined) return { state: 'open', ...base };
  if (daysLeft < 0) return { state: 'overdue', ...base };
  if (daysLeft <= DUE_SOON_DAYS) return { state: 'dueSoon', ...base };
  return { state: 'open', ...base };
};

/** Share of done items, as a whole percentage; an empty list is not progress. */
export const percentDone = (states: readonly SubmissionState[]): number =>
  states.length === 0
    ? 0
    : Math.round((states.filter((state) => state === 'done').length / states.length) * 100);
