import type { HofDashboardData } from '@/features/hof-dashboard/api/hof-dashboard-data';
import {
  AREA_DOT_CLASS,
  AREA_TEXT_CLASS,
  Panel,
  ProgressBar,
  ProgressLine,
  ResponsibleList,
  SectionHeading,
} from '@/features/hof-dashboard/components/dashboard-ui';
import { DeadlineList } from '@/features/hof-dashboard/components/deadline-list';
import {
  HOF_DASHBOARD_AREA_LABELS,
  HOF_DASHBOARD_AREAS,
  type HofDashboardArea,
} from '@/features/hof-dashboard/constants';
import { translate } from '@/features/hof-dashboard/texts';
import {
  isOpen,
  percentDone,
  type SubmissionProgress,
} from '@/features/hof-dashboard/utils/submission-progress';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import type React from 'react';

/** Which area a submission belongs to, marked by the area's colour but read as plain text. */
const AreaTag: React.FC<{ area: HofDashboardArea; locale: Locale }> = ({ area, locale }) => (
  <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600">
    <span className={cn('h-2 w-2 rounded-full', AREA_DOT_CLASS[area])} aria-hidden />
    {HOF_DASHBOARD_AREA_LABELS[area][locale]}
  </span>
);

/** Soonest first; a form without a deadline goes last. */
const byDeadline = (a: SubmissionProgress, b: SubmissionProgress): number =>
  (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999');

/**
 * What the Hof sees first: what is due next, how far it is, when the deadlines are and whom
 * to ask, in that order, so the first screen of a phone answers "what is missing?".
 */
export const OverviewView: React.FC<{
  data: HofDashboardData;
  progress: Record<string, SubmissionProgress>;
  locale: Locale;
  onOpen: (area: HofDashboardArea, formId: string) => void;
}> = ({ data, progress, locale, onOpen }) => {
  const open = data.forms
    .flatMap((form) => {
      const formProgress = progress[form.id];
      return formProgress === undefined || !isOpen(formProgress)
        ? []
        : [{ form, progress: formProgress }];
    })
    .toSorted((a, b) => byDeadline(a.progress, b.progress));
  // an area without forms has nothing to count
  const areas = HOF_DASHBOARD_AREAS.filter((area) => data.forms.some((form) => form.area === area));

  return (
    // on a wide screen what is due and how far the Hof is sit side by side, as do the
    // deadlines and whom to ask
    <div className="grid items-start gap-6 @3xl:grid-cols-2 @6xl:grid-cols-3">
      <Panel className="@3xl:col-span-2">
        <SectionHeading className="mb-2">{translate('nextUp', locale)}</SectionHeading>
        {open.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            {translate('allDone', locale)}
          </p>
        ) : (
          // the rows reach the panel's edges, so their hover is a band, not a rounded chip
          <ul className="-mx-5 divide-y divide-gray-100 border-y border-gray-100 @xl:-mx-6">
            {open.map(({ form, progress: formProgress }) => (
              <li key={form.id}>
                <button
                  type="button"
                  className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 px-5 py-3 text-left transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-green-600 @xl:px-6"
                  onClick={() => onOpen(form.area, form.id)}
                >
                  <span className="min-w-0 space-y-1">
                    {/* the area beside the title, so more of what is due fits on a phone screen */}
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-semibold text-gray-900">{form.title}</span>
                      <AreaTag area={form.area} locale={locale} />
                    </span>
                    <ProgressLine progress={formProgress} locale={locale} />
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-gray-500" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="space-y-5">
        <SectionHeading>{translate('progress', locale)}</SectionHeading>
        {areas.map((area) => {
          const states = data.forms
            .filter((form) => form.area === area)
            .flatMap((form) => progress[form.id]?.state ?? []);
          const count = translate('progressCount', locale, {
            done: states.filter((state) => state === 'done').length,
            total: states.length,
          });
          return (
            <div key={area} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className={cn('font-semibold', AREA_TEXT_CLASS[area])}>
                  {HOF_DASHBOARD_AREA_LABELS[area][locale]}
                </span>
                <span className="text-gray-600 tabular-nums">{count}</span>
              </div>
              <ProgressBar
                percent={percentDone(states)}
                area={area}
                label={`${HOF_DASHBOARD_AREA_LABELS[area][locale]}: ${count}`}
              />
            </div>
          );
        })}
      </Panel>

      <Panel className="space-y-4">
        <SectionHeading>{translate('deadlines', locale)}</SectionHeading>
        <DeadlineList deadlines={data.deadlines} locale={locale} />
      </Panel>

      <Panel className="space-y-4 @3xl:col-span-2">
        <SectionHeading>{translate('responsible', locale)}</SectionHeading>
        <ResponsibleList people={data.responsible} locale={locale} />
      </Panel>
    </div>
  );
};
