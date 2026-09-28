import type { HofDashboardForm } from '@/features/hof-dashboard/api/hof-dashboard-data';
import { translate } from '@/features/hof-dashboard/texts';
import type { Locale } from '@/types/types';

/**
 * How the dashboard heads one of a form's submissions: a version counted from the oldest, or an
 * entry by the answer that names it. `index` is its place in `form.entries`, newest first.
 */
export const entryHeading = (
  form: Pick<HofDashboardForm, 'mode' | 'entries'>,
  index: number,
  locale: Locale,
): string =>
  form.mode === 'versions'
    ? translate('version', locale, { n: form.entries.length - index })
    : (form.entries[index]?.title ?? translate('entryUntitled', locale));
