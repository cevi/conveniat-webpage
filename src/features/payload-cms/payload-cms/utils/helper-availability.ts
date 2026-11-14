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
  /** Names of the `dateSlotSelection` blocks, the "Nach Verfügbarkeit" answers. */
  dateSlotFields: string[];
  /** The windows the `dateSlotSelection` blocks offer, so empty days still get a column. */
  dateSlotWindows: DateRange[];
  jobFieldsByPhase: JobFieldsByPhase;
}

/** A helper with the camp days they are on the Platz, as `YYYY-MM-DD`. */
export interface HelperDays {
  /** The answers the export shows for the person, in the order asked for. */
  person: string[];
  days: Set<string>;
  /** The titles of the jobs the helper signed up for; empty for a helper by availability. */
  jobTitles: string[];
}

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
    dateSlotFields: dateSlotBlocks.map((block) => String(block['name'])),
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
 * lists.
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

    const availableDays = blocks.dateSlotFields.flatMap((field) => {
      const ranges = parseDateRangesValue(answers.find((answer) => answer.field === field)?.value);
      return (ranges ?? []).flatMap((range) => enumerateDays(range));
    });
    if (availableDays.length > 0) {
      byAvailability.push({ person, days: new Set(availableDays), jobTitles: [] });
    }

    const jobs = jobIds.flatMap((id) => {
      const job = jobsById.get(id);
      return job === undefined ? [] : [job];
    });
    if (jobs.length > 0) {
      byJob.push({
        person,
        days: new Set(jobs.flatMap((job) => getJobDays(job, blocks.jobFieldsByPhase, answers))),
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
