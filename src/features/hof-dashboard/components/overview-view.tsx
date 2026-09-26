import type { HofDashboardData } from '@/features/hof-dashboard/api/hof-dashboard-data';
import {
  AREA_TEXT_CLASS,
  ContactBlock,
  Panel,
  ProgressBar,
  ProgressLine,
  SECONDARY_BUTTON_CLASS,
  SectionHeading,
} from '@/features/hof-dashboard/components/dashboard-ui';
import { DeadlineList } from '@/features/hof-dashboard/components/deadline-list';
import {
  HOF_DASHBOARD_AREA_LABELS,
  HOF_DASHBOARD_AREAS,
  HOF_SUBMISSION_TYPE_LABELS,
  type HofDashboardArea,
  type HofSubmissionType,
} from '@/features/hof-dashboard/constants';
import { translate } from '@/features/hof-dashboard/texts';
import {
  percentDone,
  type SubmissionProgress,
} from '@/features/hof-dashboard/utils/submission-progress';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { CheckCircle2 } from 'lucide-react';
import type React from 'react';

/** Soonest first; a submission without a deadline goes last. */
const byDeadline = (a: SubmissionProgress, b: SubmissionProgress): number =>
  (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999');

/**
 * What the Hof sees first: what is due next, how far it is, when the deadlines are and whom
 * to ask, in that order, so the first screen of a phone answers "what is missing?".
 */
export const OverviewView: React.FC<{
  data: HofDashboardData;
  progress: Record<HofSubmissionType, SubmissionProgress>;
  locale: Locale;
  onOpen: (area: HofDashboardArea, type: HofSubmissionType) => void;
}> = ({ data, progress, locale, onOpen }) => {
  const open = data.submissions
    .filter((submission) => progress[submission.type].state !== 'done')
    .toSorted((a, b) => byDeadline(progress[a.type], progress[b.type]));

  return (
    <div className="space-y-6">
      <Panel>
        <SectionHeading className="mb-2">{translate('nextUp', locale)}</SectionHeading>
        {open.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            {translate('allDone', locale)}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {open.map((submission) => (
              <li
                key={submission.type}
                className="flex flex-col gap-2 py-3 @lg:flex-row @lg:items-center @lg:justify-between"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-semibold text-gray-900">
                    {HOF_SUBMISSION_TYPE_LABELS[submission.type][locale]}
                    <span
                      className={cn('ml-2 text-xs font-semibold', AREA_TEXT_CLASS[submission.area])}
                    >
                      {HOF_DASHBOARD_AREA_LABELS[submission.area][locale]}
                    </span>
                  </p>
                  <ProgressLine
                    progress={progress[submission.type]}
                    status={submission.status}
                    locale={locale}
                  />
                </div>
                <button
                  type="button"
                  className={cn(SECONDARY_BUTTON_CLASS, 'self-start @lg:self-center')}
                  onClick={() => onOpen(submission.area, submission.type)}
                >
                  {translate('open', locale)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-6 @3xl:grid-cols-2">
        <Panel className="space-y-5">
          <SectionHeading>{translate('progress', locale)}</SectionHeading>
          {HOF_DASHBOARD_AREAS.map((area) => {
            const states = data.submissions
              .filter((submission) => submission.area === area)
              .map((submission) => progress[submission.type].state);
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
      </div>

      <Panel className="space-y-4">
        <SectionHeading>{translate('contacts', locale)}</SectionHeading>
        <dl className="grid gap-5 @2xl:grid-cols-3">
          <ContactBlock
            label={translate('avp', locale)}
            contact={data.contacts.avp}
            locale={locale}
          />
          <ContactBlock
            label={translate('coach', locale)}
            contact={data.contacts.coach}
            locale={locale}
          />
          <ContactBlock
            label={translate('buildingManager', locale)}
            contact={data.contacts.buildingManager}
            locale={locale}
          />
        </dl>
      </Panel>
    </div>
  );
};
