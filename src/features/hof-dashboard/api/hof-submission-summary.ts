import { getHofDashboardData } from '@/features/hof-dashboard/api/hof-dashboard-data';
import type { HofEntryStatus } from '@/features/hof-dashboard/constants';
import { entryHeading } from '@/features/hof-dashboard/utils/entry-heading';
import type { Locale } from '@/types/types';

/** One of a Hof's submissions, named as the reviewers see it on the Hof's dashboard. */
export interface HofSubmissionSummary {
  /** The form's title on the dashboard, e.g. "Stadtleben". */
  form: string;
  hof: string;
  /** "Version 2", or the answer that names an entry. */
  entry: string;
  status: HofEntryStatus;
}

/**
 * Names a Hof's submission from the dashboard's own data, so what a reviewer reads elsewhere,
 * like on the page of an email's approval link, matches the dashboard word for word. Undefined
 * for a submission the dashboard does not list, e.g. of a form taken off it.
 */
export const summarizeHofSubmission = async (
  hofId: string,
  submissionId: string,
  locale: Locale,
): Promise<HofSubmissionSummary | undefined> => {
  const data = await getHofDashboardData(hofId, locale, true);
  for (const form of data.forms) {
    const index = form.entries.findIndex((entry) => entry.id === submissionId);
    const entry = form.entries[index];
    if (entry === undefined) continue;
    return {
      form: form.title,
      hof: data.hof.name,
      entry: entryHeading(form, index, locale),
      status: entry.status,
    };
  }
  return undefined;
};
