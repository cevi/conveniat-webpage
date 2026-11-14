import type { DateRange } from '@/features/payload-cms/components/form/utils/date-slots';
import {
  addDays,
  countDays,
  getSelectableDays,
  parseDateRangesValue,
} from '@/features/payload-cms/components/form/utils/date-slots';
import {
  getJobPeriodFieldName,
  getJobSelectableDays,
  getJobWindow,
} from '@/features/payload-cms/components/form/utils/job-period';
import {
  RESSORT_OPTIONS,
  RESSORT_WISH_OPTIONS,
} from '@/features/payload-cms/constants/ressort-options';
import { getFormBlocks } from '@/features/payload-cms/payload-cms/plugins/form/form-block-names';
import type { HelperJob } from '@/features/payload-cms/payload-types';

/** One answer of a form submission. */
export interface SubmissionAnswer {
  field: string;
  value: string;
}

/** The job selections of a form, by the phase (`dateRangeCategory`) they offer jobs of. */
export type JobFieldsByPhase = Map<string, string[]>;

/** The day selections and job selections of a form, read from its sections. */
export interface HelperFormBlocks {
  /**
   * The `dateSlotSelection` blocks, the "Nach Verfügbarkeit" answers, with the name of the
   * Ressort wish they ask next to the days, if they ask for one.
   */
  dateSlotFields: { name: string; ressortName: string | undefined }[];
  /** The windows the `dateSlotSelection` blocks offer, so empty days still get a column. */
  dateSlotWindows: DateRange[];
  jobFieldsByPhase: JobFieldsByPhase;
}

/** A helper with the camp days they are on the Platz, as `YYYY-MM-DD`. */
export interface HelperDays {
  /** The answers the export shows for the person, in the order asked for. */
  person: string[];
  days: Set<string>;
  /**
   * The Ressort the row belongs to, in German as the Ressorts read it: the wish of a helper by
   * availability, the Ressort of the jobs of a job helper. Empty when the helper named none.
   */
  ressort: string;
  /** The titles of the jobs the helper signed up for; empty for a helper by availability. */
  jobTitles: string[];
}

/**
 * The German name of a Ressort or Ressort wish, so both sheets filter by the same names. An
 * unknown value, from an option removed since, is shown as stored.
 */
const ressortLabel = (value: string): string =>
  RESSORT_OPTIONS.find((option) => option.value === value)?.label.de ??
  RESSORT_WISH_OPTIONS.find((option) => option.value === value)?.label.de ??
  value;

/** Every day from the first to the last, inclusive; nothing for a malformed range. */
const enumerateDays = ({ startDate, endDate }: DateRange): string[] => {
  const length = countDays(startDate, endDate);
  return Array.from({ length: Math.max(length, 0) }, (_, index) => addDays(startDate, index));
};

/** Reads the blocks of a form that carry the days a helper is on the Platz. */
export const getHelperFormBlocks = (
  sections: { formSection?: { fields?: unknown[] | null } | null }[],
): HelperFormBlocks => {
  const fields = sections.map((section) => section.formSection?.fields);

  const dateSlotBlocks = fields.flatMap((sectionFields) =>
    getFormBlocks(sectionFields, 'dateSlotSelection'),
  );
  const dateSlotWindows = dateSlotBlocks.flatMap((block) => {
    const selectable = getSelectableDays({
      startDate: block['startDate'] as string | undefined,
      endDate: block['endDate'] as string | undefined,
      minDays: 1,
    });
    return selectable === undefined
      ? []
      : [{ startDate: selectable.firstDay, endDate: selectable.lastDay }];
  });

  const jobFieldsByPhase: JobFieldsByPhase = new Map();
  for (const block of fields.flatMap((sectionFields) =>
    getFormBlocks(sectionFields, 'jobSelection'),
  )) {
    const phase = String(block['dateRangeCategory']);
    jobFieldsByPhase.set(phase, [...(jobFieldsByPhase.get(phase) ?? []), String(block['name'])]);
  }

  return {
    dateSlotFields: dateSlotBlocks.map((block) => ({
      name: String(block['name']),
      ressortName:
        typeof block['ressortName'] === 'string' && block['ressortName'] !== ''
          ? block['ressortName']
          : undefined,
    })),
    dateSlotWindows,
    jobFieldsByPhase,
  };
};

/**
 * The days a helper picked for a job with a minimum duration, as stored, or undefined when the
 * job lasts its whole window.
 *
 * A submission holds one job per selection, so a job of a phase with a single selection finds
 * the helper's days under that selection's name, whatever the job is called today. With several
 * selections for one phase, the answer naming the job's title tells them apart.
 */
export const getPickedJobDays = (
  job: HelperJob,
  jobFieldsByPhase: JobFieldsByPhase,
  answers: SubmissionAnswer[],
): string | undefined => {
  if (getJobSelectableDays(job) === undefined) return undefined;
  const jobFields = jobFieldsByPhase.get(job.dateRangeCategory) ?? [];
  const jobField =
    jobFields.length === 1
      ? jobFields[0]
      : jobFields.find((field) =>
          answers.some((answer) => answer.field === field && answer.value === job.title),
        );
  if (jobField === undefined) return undefined;
  const value = answers.find((answer) => answer.field === getJobPeriodFieldName(jobField))?.value;
  return typeof value === 'string' && value !== '' ? value : undefined;
};

/** The days a helper is on the Platz for one job: the days they picked, or the whole window. */
const getJobDays = (
  job: HelperJob,
  jobFieldsByPhase: JobFieldsByPhase,
  answers: SubmissionAnswer[],
): string[] => {
  const picked = parseDateRangesValue(getPickedJobDays(job, jobFieldsByPhase, answers));
  const window = getJobWindow(job);
  const ranges = picked ?? (window === undefined ? [] : [window]);
  return ranges.flatMap((range) => enumerateDays(range));
};

/**
 * Splits the submissions of a helper form into the helpers who gave their availability and
 * those who signed up for a job, each with the days they are on the Platz, and returns the
 * days the export shows as columns: every day of the form's day selections and of the helpers'
 * days, without gaps.
 *
 * A submission can hold both, when the form lets a helper do both; it then appears in both
 * lists. A job helper whose jobs belong to several Ressorts gets a row per Ressort, with the
 * days of that Ressort's jobs, so that each Ressort finds its helpers by filtering.
 */
export const buildHelperAvailability = ({
  blocks,
  submissions,
  jobsById,
  personFields,
}: {
  blocks: HelperFormBlocks;
  submissions: { answers: SubmissionAnswer[]; jobIds: string[] }[];
  jobsById: Map<string, HelperJob>;
  personFields: string[];
}): { days: string[]; byAvailability: HelperDays[]; byJob: HelperDays[] } => {
  const byAvailability: HelperDays[] = [];
  const byJob: HelperDays[] = [];

  for (const { answers, jobIds } of submissions) {
    const person = personFields.map(
      (field) => answers.find((answer) => answer.field === field)?.value ?? '',
    );

    const answerOf = (field: string): string =>
      answers.find((answer) => answer.field === field)?.value ?? '';

    const availableDays = blocks.dateSlotFields.flatMap(({ name }) =>
      (parseDateRangesValue(answerOf(name)) ?? []).flatMap((range) => enumerateDays(range)),
    );
    if (availableDays.length > 0) {
      const wish = blocks.dateSlotFields
        .map(({ ressortName }) => (ressortName === undefined ? '' : answerOf(ressortName)))
        .find((value) => value !== '');
      byAvailability.push({
        person,
        days: new Set(availableDays),
        ressort: wish === undefined ? '' : ressortLabel(wish),
        jobTitles: [],
      });
    }

    const jobsByRessort = new Map<string, HelperJob[]>();
    for (const id of jobIds) {
      const job = jobsById.get(id);
      if (job === undefined) continue;
      jobsByRessort.set(job.category, [...(jobsByRessort.get(job.category) ?? []), job]);
    }
    for (const [ressort, jobs] of jobsByRessort) {
      byJob.push({
        person,
        days: new Set(jobs.flatMap((job) => getJobDays(job, blocks.jobFieldsByPhase, answers))),
        ressort: ressortLabel(ressort),
        jobTitles: jobs.map((job) => job.title),
      });
    }
  }

  const knownDays = [
    ...blocks.dateSlotWindows.flatMap((window) => [window.startDate, window.endDate]),
    ...[...byAvailability, ...byJob].flatMap((helper) => [...helper.days]),
  ].sort();
  const firstDay = knownDays[0];
  const lastDay = knownDays.at(-1);
  const days =
    firstDay === undefined || lastDay === undefined
      ? []
      : enumerateDays({ startDate: firstDay, endDate: lastDay });

  return { days, byAvailability, byJob };
};
