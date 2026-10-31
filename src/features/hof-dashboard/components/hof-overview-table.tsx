'use client';

import { AppSearchBar } from '@/components/ui/app-search-bar';
import type {
  HofAreaSummary,
  HofFormState,
  HofOverviewRow,
} from '@/features/hof-dashboard/api/hof-overview';
import {
  AreaDot,
  LABEL_CLASS,
  Panel,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
  SectionHeading,
  SegmentBar,
  StatusPill,
  type SegmentTone,
} from '@/features/hof-dashboard/components/dashboard-ui';
import {
  HOF_DASHBOARD_AREA_LABELS,
  HOF_DASHBOARD_AREAS,
  HOF_ENTRY_STATUS_LABELS,
  type HofDashboardArea,
} from '@/features/hof-dashboard/constants';
import { useAcceptHofArea } from '@/features/hof-dashboard/hooks/use-accept-hof-area';
import { translate, translateCount, type TextKey } from '@/features/hof-dashboard/texts';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { CheckCheck, ChevronRight, Download } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

/** The areas a reviewer accepts at once; material orders are confirmed one by one. */
const ACCEPTED_AT_ONCE: readonly HofDashboardArea[] = ['infrastructure', 'program'];

const FILTERS = ['all', 'toReview', 'withSubmissions', 'nothing'] as const;

type Filter = (typeof FILTERS)[number];

const FILTER_LABELS: Record<Filter, TextKey> = {
  all: 'allHoefe',
  toReview: 'filterToReview',
  withSubmissions: 'filterWithSubmissions',
  nothing: 'filterNothing',
};

const SEGMENT_TONE: Record<HofFormState, SegmentTone> = {
  accepted: 'filled',
  waiting: 'waiting',
  missing: 'empty',
};

/** The table's columns where it has the room; a narrow screen stacks each Hof as a card. */
const ROW_GRID =
  '@3xl:grid @3xl:grid-cols-[minmax(10rem,1.4fr)_repeat(3,minmax(0,1fr))_6.5rem_5.5rem_1.25rem] @3xl:items-center @3xl:gap-x-6';

const toReviewOf = (hof: HofOverviewRow): number =>
  HOF_DASHBOARD_AREAS.reduce((sum, area) => sum + hof.areas[area].toReview, 0);

/** A name as it is searched: lower case, without accents, so "zuri" finds "Züri 11". */
const searchable = (value: string): string =>
  value
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLowerCase();

const matchesFilter = (hof: HofOverviewRow, filter: Filter): boolean => {
  switch (filter) {
    case 'toReview': {
      return toReviewOf(hof) > 0;
    }
    // every submission is in the Hof's ZIP, so it holds something once the Hof handed in
    case 'withSubmissions': {
      return hof.files > 0;
    }
    case 'nothing': {
      return hof.files === 0;
    }
    default: {
      return true;
    }
  }
};

/** What waits for the Ressort in one area of a Hof, in words. */
const waitingLine = (area: HofDashboardArea, n: number, locale: Locale): string =>
  area === 'material'
    ? translateCount(n, 'orderedOne', 'orderedMany', locale)
    : translateCount(n, 'handedInOne', 'handedInMany', locale);

/** One Hof with something to review: what waits, the way to it, and accepting all of it. */
const WaitingCard: React.FC<{
  hof: HofOverviewRow;
  accepting: boolean;
  onReview: (area: HofDashboardArea) => void;
  onAccept: () => void;
  locale: Locale;
}> = ({ hof, accepting, onReview, onAccept, locale }) => {
  const waiting = HOF_DASHBOARD_AREAS.filter((area) => hof.areas[area].toReview > 0);
  const toAccept = ACCEPTED_AT_ONCE.reduce((sum, area) => sum + hof.areas[area].toAccept, 0);
  const first = waiting[0];
  return (
    <li className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-base font-semibold text-green-900">{hof.name}</p>
        <StatusPill tone="warning">
          {translate('toReviewCount', locale, { n: toReviewOf(hof) })}
        </StatusPill>
      </div>
      <ul className="space-y-1">
        {waiting.map((area) => (
          <li key={area} className="flex items-center gap-2 text-sm text-green-800">
            <AreaDot area={area} />
            {HOF_DASHBOARD_AREA_LABELS[area][locale]} ·{' '}
            {waitingLine(area, hof.areas[area].toReview, locale)}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        {first !== undefined && (
          <button
            type="button"
            className={PRIMARY_BUTTON_CLASS}
            aria-label={translate('reviewHofLabel', locale, { hof: hof.name })}
            onClick={() => onReview(first)}
          >
            {translate('review', locale)}
          </button>
        )}
        {toAccept > 0 && (
          <button
            type="button"
            className={SECONDARY_BUTTON_CLASS}
            disabled={accepting}
            aria-label={translate('acceptHofLabel', locale, { hof: hof.name })}
            onClick={() => {
              const question = translate('acceptHofQuestion', locale, {
                n: toAccept,
                hof: hof.name,
              });
              if (globalThis.confirm(question)) onAccept();
            }}
          >
            <CheckCheck aria-hidden />
            {translate('acceptArea', locale)}
          </button>
        )}
      </div>
    </li>
  );
};

/** How far a Hof is in one area: handed in of all, one mark per form. */
const AreaCell: React.FC<{ area: HofDashboardArea; summary: HofAreaSummary; locale: Locale }> = ({
  area,
  summary,
  locale,
}) => {
  if (summary.forms === 0) return <span className="text-gray-400">–</span>;
  const count = (state: HofFormState): number =>
    summary.formStates.filter((candidate) => candidate === state).length;
  return (
    <div className="space-y-1.5">
      <p className="text-sm text-green-800 tabular-nums">
        {translate('progressShort', locale, { done: summary.done, total: summary.forms })}
        {summary.overdue > 0 && (
          <span className="text-danger-text">
            {' · '}
            {translate('overdueCount', locale, { n: summary.overdue })}
          </span>
        )}
      </p>
      <SegmentBar
        area={area}
        segments={summary.formStates.map((state) => SEGMENT_TONE[state])}
        label={translate('formStatesLabel', locale, {
          area: HOF_DASHBOARD_AREA_LABELS[area][locale],
          done: summary.done,
          total: summary.forms,
          accepted: count('accepted'),
          waiting: count('waiting'),
        })}
      />
    </div>
  );
};

const LegendMark: React.FC<{ className: string; label: string }> = ({ className, label }) => (
  <span className="inline-flex items-center gap-2">
    <span aria-hidden className={cn('h-1.5 w-5 rounded-full', className)} />
    {label}
  </span>
);

/**
 * Where every Hof stands, for the reviewers: first what waits for them, by Hof, with accepting
 * a Hof's Infrastruktur and Programm at once; then every Hof with how far it is per form,
 * searchable and filtered. A row opens the Hof's dashboard.
 */
export const HofOverviewTable: React.FC<{
  hoefe: HofOverviewRow[];
  onOpen: (hofId: string, area?: HofDashboardArea) => void;
  locale: Locale;
}> = ({ hoefe, onOpen, locale }) => {
  const { accept, pendingHofId } = useAcceptHofArea(locale);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const waiting = hoefe.filter((hof) => toReviewOf(hof) > 0);
  const waitingTotal = waiting.reduce((sum, hof) => sum + toReviewOf(hof), 0);
  const needle = searchable(search.trim());
  const shown = hoefe.filter(
    (hof) => matchesFilter(hof, filter) && searchable(hof.name).includes(needle),
  );

  return (
    <div className="space-y-6">
      <Panel className="space-y-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <SectionHeading className="text-xl">
            {translate('waitingForReview', locale)}
          </SectionHeading>
          {waiting.length > 0 && (
            <span className="text-sm text-green-700">
              {translateCount(waitingTotal, 'submissionCountOne', 'submissionCountMany', locale)}{' '}
              {translateCount(waiting.length, 'fromHoefeOne', 'fromHoefeMany', locale)}
            </span>
          )}
        </div>
        {waiting.length === 0 ? (
          <p className="text-base text-green-700">{translate('nothingToReview', locale)}</p>
        ) : (
          <ul className="grid gap-4 @3xl:grid-cols-2 @6xl:grid-cols-3">
            {waiting.map((hof) => (
              <WaitingCard
                key={hof.id}
                hof={hof}
                accepting={pendingHofId === hof.id}
                onReview={(area) => onOpen(hof.id, area)}
                onAccept={() => void accept(hof.id, ACCEPTED_AT_ONCE)}
                locale={locale}
              />
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="p-0 @xl:p-0">
        <div className="flex flex-wrap items-center gap-3 p-5 @xl:p-6">
          <AppSearchBar
            placeholder={translate('searchHof', locale)}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onClear={() => setSearch('')}
            className="w-full @3xl:w-72"
          />
          <div
            role="group"
            aria-label={translate('filters', locale)}
            className="flex flex-wrap gap-2"
          >
            {FILTERS.map((candidate) => (
              <button
                key={candidate}
                type="button"
                aria-pressed={filter === candidate}
                className={cn(
                  'inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm font-semibold transition',
                  filter === candidate
                    ? 'bg-conveniat-green border-conveniat-green text-white'
                    : 'border-line bg-white text-green-800 hover:bg-gray-50',
                )}
                onClick={() => setFilter(candidate)}
              >
                {translate(FILTER_LABELS[candidate], locale)}
              </button>
            ))}
          </div>
        </div>

        {hoefe.length === 0 || shown.length === 0 ? (
          <p className="border-line border-t px-5 py-6 text-base text-green-700 @xl:px-6">
            {translate(hoefe.length === 0 ? 'noHoefe' : 'noMatchingHof', locale)}
          </p>
        ) : (
          <div className="border-line border-t">
            {/* the column heads of the wide layout; a narrow one names each area in its card */}
            <div aria-hidden className={cn('bg-page hidden px-6 py-3', LABEL_CLASS, ROW_GRID)}>
              <span>{translate('hof', locale)}</span>
              {HOF_DASHBOARD_AREAS.map((area) => (
                <span key={area} className="flex items-center gap-2">
                  <AreaDot area={area} />
                  {HOF_DASHBOARD_AREA_LABELS[area][locale]}
                </span>
              ))}
              <span>{translate('filterToReview', locale)}</span>
              <span>{translate('files', locale)}</span>
            </div>
            <ul className="divide-line divide-y">
              {shown.map((hof) => {
                const toReview = toReviewOf(hof);
                return (
                  <li
                    key={hof.id}
                    className={cn(
                      'relative space-y-3 px-5 py-4 transition hover:bg-gray-50 @xl:px-6 @3xl:space-y-0',
                      ROW_GRID,
                    )}
                  >
                    {/* the whole row opens the Hof; the ZIP link sits above it */}
                    <button
                      type="button"
                      className="cursor-pointer text-left text-base font-semibold text-green-900 after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-green-600"
                      aria-label={translate('openHof', locale, { hof: hof.name })}
                      onClick={() => onOpen(hof.id)}
                    >
                      {hof.name}
                    </button>
                    {HOF_DASHBOARD_AREAS.map((area) => (
                      <div key={area} className="min-w-0">
                        {/* read out on every width, shown where no column head names it */}
                        <p className={cn(LABEL_CLASS, 'mb-1 @3xl:sr-only')}>
                          {HOF_DASHBOARD_AREA_LABELS[area][locale]}
                        </p>
                        <AreaCell area={area} summary={hof.areas[area]} locale={locale} />
                      </div>
                    ))}
                    <div className="flex flex-wrap items-center gap-3 @3xl:contents">
                      <div>
                        {toReview > 0 ? (
                          <StatusPill tone="warning">
                            {translate('toReviewCount', locale, { n: toReview })}
                          </StatusPill>
                        ) : (
                          <span aria-hidden className="hidden text-gray-400 @3xl:inline">
                            –
                          </span>
                        )}
                      </div>
                      <div>
                        {hof.files === 0 ? (
                          <span aria-hidden className="hidden text-gray-400 @3xl:inline">
                            –
                          </span>
                        ) : (
                          <a
                            href={`/api/hof-dashboard/${encodeURIComponent(hof.id)}/files`}
                            download
                            className="text-conveniat-green relative z-10 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold underline-offset-2 hover:underline"
                            aria-label={translate('downloadFiles', locale, { hof: hof.name })}
                          >
                            <Download className="h-4 w-4" aria-hidden />
                            {translate('zipFiles', locale, { n: hof.files })}
                          </a>
                        )}
                      </div>
                    </div>
                    <ChevronRight
                      aria-hidden
                      className="hidden h-5 w-5 justify-self-end text-green-500 @3xl:block"
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="border-line flex flex-wrap gap-x-6 gap-y-2 border-t px-5 py-4 text-sm text-green-700 @xl:px-6">
          <LegendMark
            className="bg-conveniat-green"
            label={HOF_ENTRY_STATUS_LABELS.accepted[locale]}
          />
          <LegendMark className="bg-amber-500" label={translate('legendWaiting', locale)} />
          <LegendMark className="bg-gray-100" label={translate('legendMissing', locale)} />
        </div>
      </Panel>
    </div>
  );
};
