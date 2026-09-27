import { DUE_SOON_DAYS, type HofSubmissionStatus } from '@/features/hof-dashboard/constants';

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

const soonestFirst = (deadlines: readonly string[]): string[] =>
  deadlines.toSorted((a, b) => new Date(a).getTime() - new Date(b).getTime());

/** The deadline a submission works towards: the next one still ahead, else the last one. */
export const nextDeadline = (deadlines: readonly string[], now: Date): string | undefined => {
  const sorted = soonestFirst(deadlines);
  return sorted.find((deadline) => daysUntil(deadline, now) >= 0) ?? sorted.at(-1);
};

export type SubmissionState = 'done' | 'open' | 'dueSoon' | 'overdue';

/** What is still missing before a submission counts as handed in. */
export type SubmissionGap = 'plan' | 'safetyRiskAnswer' | 'safetyConcept' | 'revision';

export interface SubmissionProgressInput {
  hasPlan: boolean;
  hasSafetyConcept: boolean;
  elevatedSafetyRisk: 'yes' | 'no' | null | undefined;
  status: HofSubmissionStatus | null | undefined;
  deadlines: readonly string[];
}

export interface SubmissionProgress {
  state: SubmissionState;
  gap: SubmissionGap | undefined;
  deadline: string | undefined;
  daysLeft: number | undefined;
}

const findGap = (input: SubmissionProgressInput): SubmissionGap | undefined => {
  if (!input.hasPlan) return 'plan';
  if (input.status === 'revisionRequired') return 'revision';
  if (input.elevatedSafetyRisk !== 'yes' && input.elevatedSafetyRisk !== 'no') {
    return 'safetyRiskAnswer';
  }
  if (input.elevatedSafetyRisk === 'yes' && !input.hasSafetyConcept) return 'safetyConcept';
  return undefined;
};

/**
 * Where a Hof stands with one submission: handed in, or how urgently something is missing.
 *
 * A submission is done once its plan is up, the safety question is answered, a safety concept
 * is up when the answer is yes, and the Ressort has not sent it back for a revision.
 *
 * Something missing since a deadline that has passed is overdue from that deadline on, even
 * with a later one ahead: a Hof that missed the first Grobkonzept is late, not early for the
 * second. A revision the Ressort asks for works towards the next deadline instead.
 */
export const getSubmissionProgress = (
  input: SubmissionProgressInput,
  now: Date,
): SubmissionProgress => {
  const gap = findGap(input);
  const earliest = soonestFirst(input.deadlines)[0];
  const missedEarliest = earliest !== undefined && daysUntil(earliest, now) < 0;
  const firstMissed =
    gap === undefined || gap === 'revision' || !missedEarliest ? undefined : earliest;
  const deadline = firstMissed ?? nextDeadline(input.deadlines, now);
  const daysLeft = deadline === undefined ? undefined : daysUntil(deadline, now);

  if (gap === undefined) return { state: 'done', gap, deadline, daysLeft };
  if (daysLeft === undefined) return { state: 'open', gap, deadline, daysLeft };
  if (daysLeft < 0) return { state: 'overdue', gap, deadline, daysLeft };
  if (daysLeft <= DUE_SOON_DAYS) return { state: 'dueSoon', gap, deadline, daysLeft };
  return { state: 'open', gap, deadline, daysLeft };
};

/** Share of done items, as a whole percentage; an empty list is not progress. */
export const percentDone = (states: readonly SubmissionState[]): number =>
  states.length === 0
    ? 0
    : Math.round((states.filter((state) => state === 'done').length / states.length) * 100);
