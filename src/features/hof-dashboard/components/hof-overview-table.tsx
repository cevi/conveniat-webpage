'use client';

import type { HofAreaSummary, HofOverviewRow } from '@/features/hof-dashboard/api/hof-overview';
import {
  Panel,
  SectionHeading,
  StatusPill,
} from '@/features/hof-dashboard/components/dashboard-ui';
import {
  HOF_DASHBOARD_AREA_LABELS,
  HOF_DASHBOARD_AREAS,
  type HofDashboardArea,
} from '@/features/hof-dashboard/constants';
import { useAcceptHofArea } from '@/features/hof-dashboard/hooks/use-accept-hof-area';
import { translate } from '@/features/hof-dashboard/texts';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { CheckCheck, Download } from 'lucide-react';
import type React from 'react';

/** The areas a reviewer accepts at once; material orders are answered one by one. */
const ACCEPTED_AT_ONCE = new Set<HofDashboardArea>(['infrastructure', 'program']);

/**
 * A Hof's row as a table where the dashboard has room for one; below that each Hof is a card
 * with its areas stacked, so a phone never scrolls sideways.
 */
const ROW_GRID =
  '@3xl:grid @3xl:grid-cols-[minmax(9rem,1.2fr)_repeat(3,minmax(0,1fr))_7rem] @3xl:items-start @3xl:gap-x-4';

const LINK_CLASS =
  'text-conveniat-green inline-flex min-h-10 cursor-pointer items-center gap-1.5 text-sm font-semibold underline-offset-2 hover:underline disabled:cursor-wait disabled:opacity-50';

const AreaCell: React.FC<{
  hof: HofOverviewRow;
  area: HofDashboardArea;
  summary: HofAreaSummary;
  accepting: boolean;
  onAccept: () => void;
  locale: Locale;
}> = ({ hof, area, summary, accepting, onAccept, locale }) => {
  if (summary.forms === 0) return <span className="text-gray-400">–</span>;
  const areaLabel = HOF_DASHBOARD_AREA_LABELS[area][locale];
  return (
    <div className="space-y-1">
      <p className="text-gray-900 tabular-nums">
        {translate('progressCount', locale, { done: summary.done, total: summary.forms })}
      </p>
      <div className="flex flex-wrap gap-1">
        {summary.overdue > 0 && (
          <StatusPill tone="alert">
            {translate('overdueCount', locale, { n: summary.overdue })}
          </StatusPill>
        )}
        {summary.toReview > 0 && (
          <StatusPill tone="neutral">
            {translate('toReviewCount', locale, { n: summary.toReview })}
          </StatusPill>
        )}
        {summary.done === summary.forms && summary.toAccept === 0 && (
          <StatusPill tone="done">{translate('allAccepted', locale)}</StatusPill>
        )}
      </div>
      {ACCEPTED_AT_ONCE.has(area) && summary.toAccept > 0 && (
        <button
          type="button"
          className={LINK_CLASS}
          disabled={accepting}
          aria-label={translate('acceptAreaLabel', locale, { area: areaLabel, hof: hof.name })}
          onClick={() => {
            const question = translate('acceptAreaQuestion', locale, {
              n: summary.toAccept,
              hof: hof.name,
              area: areaLabel,
            });
            if (globalThis.confirm(question)) onAccept();
          }}
        >
          <CheckCheck className="h-4 w-4" aria-hidden />
          {translate('acceptArea', locale)}
        </button>
      )}
    </div>
  );
};

/**
 * Where every Hof stands, for the reviewers: per area how much is handed in, overdue and
 * waiting for the Ressort, with a way to accept a Hof's Infrastruktur or Programm at once and
 * to download everything a Hof handed in. A Hof's name opens its dashboard below.
 */
export const HofOverviewTable: React.FC<{
  hoefe: HofOverviewRow[];
  selectedHofId: string | undefined;
  onOpen: (hofId: string) => void;
  locale: Locale;
}> = ({ hoefe, selectedHofId, onOpen, locale }) => {
  const { accept, pending } = useAcceptHofArea(locale);

  return (
    <Panel className="space-y-4">
      <SectionHeading>{translate('allHoefe', locale)}</SectionHeading>
      {hoefe.length === 0 ? (
        <p className="text-sm text-gray-500">{translate('noHoefe', locale)}</p>
      ) : (
        // the rows reach the panel's edges; long lists scroll within, the header stays.
        // relative, so the sr-only area labels of the wide layout are clipped here too: an
        // absolute element positioned outside a scroll box escapes it and lengthens the page
        <div className="relative -mx-5 max-h-[32rem] overflow-y-auto border-y border-gray-100 @xl:-mx-6">
          {/* the column heads of the wide layout; a narrow one names each area in its card */}
          <div
            aria-hidden
            className={cn(
              'sticky top-0 z-10 hidden bg-gray-50 px-6 py-2 text-xs font-semibold tracking-wider text-gray-500 uppercase',
              ROW_GRID,
            )}
          >
            <span>{translate('hof', locale)}</span>
            {HOF_DASHBOARD_AREAS.map((area) => (
              <span key={area}>{HOF_DASHBOARD_AREA_LABELS[area][locale]}</span>
            ))}
            <span>{translate('files', locale)}</span>
          </div>
          <ul className="divide-y divide-gray-100">
            {hoefe.map((hof) => {
              const selected = hof.id === selectedHofId;
              return (
                <li
                  key={hof.id}
                  className={cn('px-5 py-3 text-sm @xl:px-6', ROW_GRID, selected && 'bg-green-50')}
                >
                  <div className="flex items-center justify-between gap-3 @3xl:contents">
                    <button
                      type="button"
                      className={cn(LINK_CLASS, 'text-left')}
                      aria-label={translate('openHof', locale, { hof: hof.name })}
                      aria-current={selected ? 'true' : undefined}
                      onClick={() => onOpen(hof.id)}
                    >
                      {hof.name}
                    </button>
                    <div className="shrink-0 @3xl:order-last">
                      {hof.files === 0 ? (
                        <span className="text-gray-400">–</span>
                      ) : (
                        <a
                          href={`/api/hof-dashboard/${encodeURIComponent(hof.id)}/files`}
                          download
                          className={LINK_CLASS}
                          aria-label={translate('downloadFiles', locale, { hof: hof.name })}
                        >
                          <Download className="h-4 w-4" aria-hidden />
                          {translate('zipFiles', locale, { n: hof.files })}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 grid gap-3 @md:grid-cols-3 @3xl:contents">
                    {HOF_DASHBOARD_AREAS.map((area) => (
                      <div key={area} className="min-w-0">
                        {/* read out on every width, shown where no column head names it */}
                        <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase @3xl:sr-only">
                          {HOF_DASHBOARD_AREA_LABELS[area][locale]}
                        </p>
                        <AreaCell
                          hof={hof}
                          area={area}
                          summary={hof.areas[area]}
                          accepting={pending?.hofId === hof.id && pending.area === area}
                          onAccept={() => void accept(hof.id, area)}
                          locale={locale}
                        />
                      </div>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Panel>
  );
};
