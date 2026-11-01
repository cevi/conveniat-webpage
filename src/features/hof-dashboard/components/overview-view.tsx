import type {
  HofDashboardData,
  HofDashboardForm,
} from '@/features/hof-dashboard/api/hof-dashboard-data';
import {
  AreaIcon,
  LABEL_CLASS,
  Panel,
  ProgressPill,
  QUIET_BUTTON_CLASS,
  ResponsibleList,
  SECONDARY_BUTTON_CLASS,
  SectionHeading,
  SegmentBar,
} from '@/features/hof-dashboard/components/dashboard-ui';
import { DeadlineTimeline, dueByDay } from '@/features/hof-dashboard/components/deadline-list';
import { DocumentLinks } from '@/features/hof-dashboard/components/document-links';
import {
  HOF_DASHBOARD_AREA_LABELS,
  HOF_DASHBOARD_AREAS,
  type HofDashboardArea,
} from '@/features/hof-dashboard/constants';
import {
  formatCountdown,
  formatDate,
  translate,
  translateCount,
  type TextKey,
} from '@/features/hof-dashboard/texts';
import {
  isOpen,
  type SubmissionProgress,
} from '@/features/hof-dashboard/utils/submission-progress';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { CheckCircle2, ChevronRight, Clock, Lock } from 'lucide-react';
import type React from 'react';

/** Documents the overview lists; the rest are a tap away under "Dokumente". */
const OVERVIEW_DOCUMENTS = 3;

interface FormWithProgress {
  form: HofDashboardForm;
  progress: SubmissionProgress;
}

/** Soonest first; a form without a deadline goes last. */
const byDeadline = (a: FormWithProgress, b: FormWithProgress): number =>
  (a.progress.deadline ?? '9999').localeCompare(b.progress.deadline ?? '9999');

/** The open forms by their due date, soonest first, those without one last. */
const groupByDeadline = (
  open: readonly FormWithProgress[],
): { deadline: string | undefined; forms: FormWithProgress[] }[] => {
  const groups: { deadline: string | undefined; forms: FormWithProgress[] }[] = [];
  for (const entry of open.toSorted(byDeadline)) {
    const last = groups.at(-1);
    // the same day, whatever the time an editor stored with it
    const day = entry.progress.daysLeft;
    if (last !== undefined && last.forms[0]?.progress.daysLeft === day) last.forms.push(entry);
    else groups.push({ deadline: entry.progress.deadline, forms: [entry] });
  }
  return groups;
};

/** What the row's button does: hand in, revise, or order. */
const rowAction = ({ form, progress }: FormWithProgress): TextKey => {
  if (progress.gap === 'revision') return 'revise';
  if (form.area === 'material') return form.entries.length === 0 ? 'placeOrder' : 'changeOrder';
  return 'handIn';
};

/** The area, and what the Hof handed in so far or how the form counts. */
const rowDetail = (form: HofDashboardForm, locale: Locale): string => {
  const parts = [HOF_DASHBOARD_AREA_LABELS[form.area][locale]];
  const newest = form.entries[0];
  if (form.mode === 'entries' && form.entries.length > 0) {
    parts.push(translate('entriesCount', locale, { n: form.entries.length }));
  } else if (newest !== undefined) {
    parts.push(
      translate('versionOn', locale, {
        n: form.entries.length,
        date: formatDate(newest.submittedAt, locale),
      }),
    );
  } else if (form.area === 'material' && form.mode === 'versions') {
    parts.push(translate('newestOrderCounts', locale));
  }
  return parts.join(' · ');
};

/** One form in the overview's list, with the button that leads to it. */
const FormRow: React.FC<{
  entry: FormWithProgress;
  locale: Locale;
  onOpen: () => void;
}> = ({ entry, locale, onOpen }) => {
  const { form, progress } = entry;
  const open = isOpen(progress);
  return (
    <li className="grid items-center gap-x-4 gap-y-3 px-5 py-4 @min-[420px]:grid-cols-[minmax(0,1fr)_auto] @min-[640px]:grid-cols-[minmax(0,1fr)_auto_auto] @xl:px-6">
      <div className="flex min-w-0 items-start gap-3">
        <AreaIcon area={form.area} className="mt-1" />
        <div className="min-w-0">
          <p className="text-base font-semibold text-balance text-green-900">{form.title}</p>
          <p className="text-sm text-green-700">{rowDetail(form, locale)}</p>
          {/* under the title while the row is narrow, a column of its own once it is wide */}
          <p className="pt-1.5 @min-[640px]:hidden">
            <ProgressPill progress={progress} locale={locale} />
          </p>
        </div>
      </div>
      <div className="hidden @min-[640px]:block">
        <ProgressPill progress={progress} locale={locale} />
      </div>
      <button
        type="button"
        className={cn(
          open ? SECONDARY_BUTTON_CLASS : QUIET_BUTTON_CLASS,
          'ml-5 justify-self-start @min-[420px]:ml-0 @min-[420px]:justify-self-end',
        )}
        aria-label={translate('openFormLabel', locale, { form: form.title })}
        onClick={onOpen}
      >
        {translate(open ? rowAction(entry) : 'view', locale)}
        <ChevronRight aria-hidden />
      </button>
    </li>
  );
};

/** The head of a group in the list: its icon, its name, and how much is in it. */
const GroupHead: React.FC<{
  icon: React.ReactNode;
  title: string;
  detail: string;
  tone?: 'alert' | undefined;
}> = ({ icon, title, detail, tone }) => (
  <li className="bg-page flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 text-sm @xl:px-6">
    <span
      aria-hidden
      className={cn('[&_svg]:h-4 [&_svg]:w-4', tone === 'alert' ? 'text-danger' : 'text-green-700')}
    >
      {icon}
    </span>
    <span className={cn('font-semibold', tone === 'alert' ? 'text-danger-text' : 'text-green-900')}>
      {title}
    </span>
    <span className="text-green-700">{detail}</span>
  </li>
);

/** How much is open, when it is next due, and how far each area is: the first line to read. */
const SummaryStrip: React.FC<{
  data: HofDashboardData;
  entries: readonly FormWithProgress[];
  locale: Locale;
  onOpenArea: (area: HofDashboardArea) => void;
}> = ({ data, entries, locale, onOpenArea }) => {
  const open = entries.filter(({ progress }) => isOpen(progress)).toSorted(byDeadline);
  const next = open.find(({ progress }) => progress.deadline !== undefined)?.progress;
  // an area without forms has nothing to count
  const areas = HOF_DASHBOARD_AREAS.filter((area) => data.forms.some((form) => form.area === area));

  return (
    <Panel className="divide-line grid divide-y p-0 @min-[640px]:auto-cols-fr @min-[640px]:grid-flow-col @min-[640px]:divide-x @min-[640px]:divide-y-0 @xl:p-0">
      <div className="space-y-1 p-5 @xl:p-6">
        <p className={LABEL_CLASS}>{translate('stillOpen', locale)}</p>
        {open.length === 0 ? (
          <p className="flex items-center gap-2 pt-1 text-base text-green-700">
            <CheckCircle2 className="h-5 w-5" aria-hidden />
            {translate('allDone', locale)}
          </p>
        ) : (
          <>
            <p className="flex items-baseline gap-2">
              <span className="font-heading text-heading text-4xl leading-none font-extrabold tabular-nums">
                {open.length}
              </span>
              <span className="text-base font-medium text-green-900">
                {translate(open.length === 1 ? 'submissionOne' : 'submissionMany', locale)}
              </span>
            </p>
            {next?.deadline !== undefined && next.daysLeft !== undefined && (
              <p
                className={cn('text-sm', next.daysLeft < 0 ? 'text-danger-text' : 'text-green-700')}
              >
                {translate('nextDeadline', locale)}{' '}
                <span className="font-semibold tabular-nums">
                  {formatDate(next.deadline, locale)}
                </span>{' '}
                · {formatCountdown(next.daysLeft, locale)}
              </p>
            )}
          </>
        )}
      </div>
      {areas.map((area) => {
        const ofArea = entries.filter(({ form }) => form.area === area);
        const done = ofArea.filter(({ progress }) => progress.state === 'done').length;
        const count = translate('progressCount', locale, { done, total: ofArea.length });
        const label = HOF_DASHBOARD_AREA_LABELS[area][locale];
        return (
          <button
            key={area}
            type="button"
            className="cursor-pointer space-y-3 p-5 text-left transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-green-600 @xl:p-6"
            onClick={() => onOpenArea(area)}
          >
            <span className="flex items-center gap-2 text-base font-semibold text-green-900">
              <AreaIcon area={area} />
              {label}
            </span>
            <span className="block text-sm text-green-700 tabular-nums">{count}</span>
            <SegmentBar
              area={area}
              label={`${label}: ${count}`}
              segments={ofArea.map(({ progress }) =>
                progress.state === 'done' ? 'filled' : 'empty',
              )}
            />
          </button>
        );
      })}
    </Panel>
  );
};

/**
 * What the Hof sees first: how much is open and when it is next due, then everything it has
 * to hand in grouped by deadline, each with the button that leads to it, and beside it the
 * deadlines as a timeline and the documents. What is done is listed last.
 */
export const OverviewView: React.FC<{
  data: HofDashboardData;
  progress: Record<string, SubmissionProgress>;
  locale: Locale;
  onOpen: (area: HofDashboardArea, formId: string) => void;
  onOpenArea: (area: HofDashboardArea) => void;
  onOpenDocuments: () => void;
}> = ({ data, progress, locale, onOpen, onOpenArea, onOpenDocuments }) => {
  const entries: FormWithProgress[] = data.forms.flatMap((form) => {
    const formProgress = progress[form.id];
    return formProgress === undefined ? [] : [{ form, progress: formProgress }];
  });
  const open = entries.filter((entry) => isOpen(entry.progress));
  const done = entries.filter((entry) => entry.progress.state === 'done');
  const closed = entries.filter((entry) => entry.progress.state === 'closed');
  const due = dueByDay(
    entries.map((entry) => ({ deadline: entry.form.deadline, open: isOpen(entry.progress) })),
    new Date(),
  );
  const row = (entry: FormWithProgress): React.ReactNode => (
    <FormRow
      key={entry.form.id}
      entry={entry}
      locale={locale}
      onOpen={() => onOpen(entry.form.area, entry.form.id)}
    />
  );

  return (
    <div className="space-y-6">
      <SummaryStrip data={data} entries={entries} locale={locale} onOpenArea={onOpenArea} />

      <div className="grid items-start gap-6 @min-[760px]:grid-cols-[minmax(0,1fr)_minmax(15rem,18rem)]">
        <Panel className="@container p-0 @xl:p-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-5 pb-4 @xl:px-6 @xl:pt-6">
            <SectionHeading className="text-xl">
              {translate('openSubmissions', locale)}
            </SectionHeading>
            {open.length > 1 && (
              <span className="text-sm text-green-700">
                {translate('sortedByDeadline', locale)}
              </span>
            )}
          </div>
          <ul className="divide-line border-line divide-y border-t">
            {open.length === 0 && (
              <li className="flex items-center gap-2 px-5 py-4 text-base text-green-700 @xl:px-6">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                {translate('allDone', locale)}
              </li>
            )}
            {groupByDeadline(open).map((group) => {
              const daysLeft = group.forms[0]?.progress.daysLeft;
              const count = translateCount(
                group.forms.length,
                'submissionCountOne',
                'submissionCountMany',
                locale,
              );
              return [
                <GroupHead
                  key={`head-${group.deadline ?? 'none'}`}
                  icon={<Clock />}
                  tone={daysLeft !== undefined && daysLeft < 0 ? 'alert' : undefined}
                  title={
                    group.deadline === undefined
                      ? translate('noDeadline', locale)
                      : translate('dueOn', locale, { date: formatDate(group.deadline, locale) })
                  }
                  detail={
                    daysLeft === undefined
                      ? count
                      : `${formatCountdown(daysLeft, locale)} · ${count}`
                  }
                />,
                ...group.forms.map((entry) => row(entry)),
              ];
            })}
            {done.length > 0 && [
              <GroupHead
                key="head-done"
                icon={<CheckCircle2 />}
                title={translate('doneGroup', locale)}
                detail={translateCount(
                  done.length,
                  'submissionCountOne',
                  'submissionCountMany',
                  locale,
                )}
              />,
              ...done.map((entry) => row(entry)),
            ]}
            {closed.length > 0 && [
              <GroupHead
                key="head-closed"
                icon={<Lock />}
                title={translate('gapClosed', locale)}
                detail={translateCount(
                  closed.length,
                  'submissionCountOne',
                  'submissionCountMany',
                  locale,
                )}
              />,
              ...closed.map((entry) => row(entry)),
            ]}
          </ul>
        </Panel>

        <div className="space-y-6">
          <Panel className="space-y-5">
            <SectionHeading className="text-xl">{translate('deadlines', locale)}</SectionHeading>
            <DeadlineTimeline deadlines={data.deadlines} due={due} locale={locale} />
          </Panel>

          {data.documents.length > 0 && (
            // a container of its own, so the rows lay out for this narrow column
            <Panel className="@container space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <SectionHeading className="text-xl">
                  {translate('areaDocuments', locale)}
                </SectionHeading>
                {data.documents.length > OVERVIEW_DOCUMENTS && (
                  <button
                    type="button"
                    className="text-conveniat-green min-h-11 cursor-pointer text-sm font-semibold underline underline-offset-2"
                    onClick={onOpenDocuments}
                  >
                    {translate('allDocuments', locale)}
                  </button>
                )}
              </div>
              <DocumentLinks
                documents={data.documents.slice(0, OVERVIEW_DOCUMENTS)}
                locale={locale}
              />
            </Panel>
          )}

          {/* whom to ask; on a wide screen it stays beside the sections instead */}
          <Panel className="space-y-4 @min-[900px]/dashboard:hidden">
            <SectionHeading>{translate('responsible', locale)}</SectionHeading>
            <ResponsibleList people={data.responsible} locale={locale} />
          </Panel>
        </div>
      </div>
    </div>
  );
};
