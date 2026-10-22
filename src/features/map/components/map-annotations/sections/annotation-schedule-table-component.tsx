'use client';

import { SectionLabel } from '@/components/ui/section-label';
import type { CampScheduleEntry } from '@/features/map/types/types';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { campClockOf } from '@/utils/camp-clock';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { useMemo, useState } from 'react';

const scheduleTableTitle: StaticTranslationString = {
  de: 'Programm an diesem Ort',
  en: 'Programme at this place',
  fr: 'Programme à cet endroit',
};

interface ScheduleRow {
  entry: CampScheduleEntry;
  dayKey: string;
  start: string;
  end: string;
}

const quartierIdsOf = (entry: CampScheduleEntry): string[] =>
  (entry.quartiere ?? []).flatMap((quartier) => {
    if (typeof quartier === 'string') return [quartier];
    return quartier === null ? [] : [quartier.id];
  });

/**
 * The programme at a place, one row per block and day: the slot of the user's own Quartier
 * where the Quartiere take turns, else the first. What is still to come leads, in order; what is
 * over follows. Meals, walks and Fixpunkte are left out: they have no page to open, and the
 * Fixpunkte sit on catch-all places like "Lagerplatz", where a Tagwache a day would bury the
 * programme.
 */
const rowsOf = (
  schedule: readonly CampScheduleEntry[],
  myQuartierIds: ReadonlySet<string>,
  now: { dayKey: string; time: string },
): ScheduleRow[] => {
  const blocks = new Map<string, ScheduleRow>();
  for (const entry of schedule) {
    if (typeof entry.kind === 'string' && entry.kind !== 'program') continue;
    const dayKey = String(entry.timeslot.date).slice(0, 10);
    const [start = '', end = ''] = entry.timeslot.time.split(' - ');
    const key = `${dayKey}|${entry.title}`;
    const isMine = quartierIdsOf(entry).some((id) => myQuartierIds.has(id));
    const current = blocks.get(key);
    const currentIsMine =
      current !== undefined && quartierIdsOf(current.entry).some((id) => myQuartierIds.has(id));
    if (
      current === undefined ||
      (isMine && !currentIsMine) ||
      (!currentIsMine && start < current.start)
    ) {
      blocks.set(key, { entry, dayKey, start, end });
    }
  }

  const isOver = (row: ScheduleRow): boolean =>
    row.dayKey < now.dayKey || (row.dayKey === now.dayKey && row.end <= now.time);
  return [...blocks.values()].sort(
    (a, b) =>
      Number(isOver(a)) - Number(isOver(b)) ||
      a.dayKey.localeCompare(b.dayKey) ||
      a.start.localeCompare(b.start),
  );
};

/** "Sa 24." for the day column, without the dot and comma of the long form. */
const dayLabelOf = (dayKey: string, locale: Locale): string =>
  new Date(`${dayKey}T12:00:00Z`)
    .toLocaleDateString(locale, { weekday: 'short', day: 'numeric', timeZone: 'UTC' })
    .replace(/\.,/, '')
    .replace(',', '');

export const AnnotationScheduleTableComponent: React.FC<{
  schedule: CampScheduleEntry[] | undefined;
  locale: Locale;
}> = ({ schedule, locale }) => {
  const { data: myQuartiere } = trpc.schedule.getMyQuartiere.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
  });
  // the persisted query cache may hold anything an older version stored under this key
  const myQuartierIds = useMemo(
    () =>
      new Set(
        (Array.isArray(myQuartiere) ? myQuartiere : [])
          .map((quartier) => quartier.id)
          .filter((id) => typeof id === 'string'),
      ),
    [myQuartiere],
  );
  const [now] = useState(() => {
    const clock = campClockOf(new Date());
    const time = `${String(Math.floor(clock.minutes / 60)).padStart(2, '0')}:${String(clock.minutes % 60).padStart(2, '0')}`;
    return { dayKey: clock.dayKey, time };
  });
  const rows = useMemo(
    () => rowsOf(schedule ?? [], myQuartierIds, now),
    [schedule, myQuartierIds, now],
  );

  if (rows.length === 0) return <></>;

  return (
    <section className="pt-3 pb-4">
      <SectionLabel as="h3">{scheduleTableTitle[locale]}</SectionLabel>
      <ul className="mt-1">
        {rows.map(({ entry, dayKey, start }) => (
          <li key={entry.id} className="border-line border-b last:border-b-0">
            <Link
              href={`/app/schedule?date=${dayKey}&id=${entry.id}`}
              className="focus-visible:focus-ring-inset hover:bg-quiet -mx-4 flex min-h-[52px] items-center gap-2.5 px-4 py-1.5 transition-colors"
            >
              <span className="w-16 shrink-0">
                <span className="block text-xs font-medium text-green-500">
                  {dayLabelOf(dayKey, locale)}
                </span>
                <span className="block text-[15px] font-bold text-green-900 tabular-nums">
                  {start}
                </span>
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-green-900">
                {entry.title}
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-green-500" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};
