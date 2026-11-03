import type {
  HofDashboardEntry,
  HofReviewLogEntry,
} from '@/features/hof-dashboard/api/hof-dashboard-data';
import { HOF_ENTRY_STATUS_LABELS, type HofEntryStatus } from '@/features/hof-dashboard/constants';
import { translate } from '@/features/hof-dashboard/texts';
import type { Locale } from '@/types/types';

/** One step of a history: a version handed in, an answer of the Ressort, or a comment. */
export interface TimelineStep {
  at: string;
  title: string;
  /** Who did it, or that nobody was recorded. */
  by: string;
  lines: string[];
  /** A comment, quoted under the step. */
  quote: string | undefined;
  tone: 'version' | 'revision' | 'accepted' | 'review';
}

const STATUS_TONE: Record<HofEntryStatus, TimelineStep['tone']> = {
  submitted: 'review',
  inReview: 'review',
  revisionRequired: 'revision',
  accepted: 'accepted',
};

/** What a change of the review did, as its title: the status it set before anything else. */
const titleOf = (change: HofReviewLogEntry, locale: Locale): string => {
  const final = translate('finalShort', locale);
  if (change.status !== undefined) {
    const status = HOF_ENTRY_STATUS_LABELS[change.status][locale];
    return change.final === true ? `${status} · ${final}` : status;
  }
  if (change.final === true) return translate('markedFinal', locale);
  if (change.final === false) return translate('finalLifted', locale);
  return translate(change.comment === '' ? 'commentRemoved' : 'commentStep', locale);
};

/**
 * Every change of a submission's review as a step of its history, oldest first: who did it,
 * when, the status or final mark it set, and the comment it added.
 */
export const reviewSteps = (log: readonly HofReviewLogEntry[], locale: Locale): TimelineStep[] =>
  log.map((change) => ({
    at: change.at,
    title: titleOf(change, locale),
    by: change.by === '' ? translate('reviewerUnknown', locale) : change.by,
    lines: [],
    quote: change.comment === undefined || change.comment === '' ? undefined : change.comment,
    tone: change.status === undefined ? 'review' : STATUS_TONE[change.status],
  }));

/**
 * The whole history of one submission, oldest first: who handed it in and when, then every
 * answer and comment of the Ressort. The Hof and the Ressort read the same.
 */
export const entrySteps = (entry: HofDashboardEntry, locale: Locale): TimelineStep[] => [
  {
    at: entry.submittedAt,
    title: translate('handedIn', locale),
    by: entry.submittedBy ?? translate('hof', locale),
    lines: [],
    quote: undefined,
    tone: 'version',
  },
  ...reviewSteps(entry.reviewLog, locale),
];
