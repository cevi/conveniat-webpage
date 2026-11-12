'use client';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { SectionLabel } from '@/components/ui/section-label';
import { segmentClassName, segmentedTrackClassName } from '@/components/ui/segmented-control';
import { forumText } from '@/features/chat/components/forum/forum-texts';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { CheckCircle2 } from 'lucide-react';
import type React from 'react';

export type ForumStatusFilter = 'active' | 'done';
export type ForumListFilter =
  'all' | 'mine' | 'assignedToMe' | 'subscribed' | 'pending' | 'flagged';
export type ForumSort = 'new' | 'popular';

export interface ForumFilters {
  status: ForumStatusFilter;
  filter: ForumListFilter;
  sort: ForumSort;
}

export const DEFAULT_FORUM_FILTERS: ForumFilters = { status: 'active', filter: 'all', sort: 'new' };

/** Whether the feed shows something else than its default: open posts, all of them, newest. */
export const isFiltered = (filters: ForumFilters): boolean =>
  filters.status !== DEFAULT_FORUM_FILTERS.status ||
  filters.filter !== DEFAULT_FORUM_FILTERS.filter ||
  filters.sort !== DEFAULT_FORUM_FILTERS.sort;

const listFilterText: Record<ForumListFilter, StaticTranslationString> = {
  all: forumText.filterAll,
  mine: forumText.filterMine,
  subscribed: forumText.filterSubscribed,
  assignedToMe: forumText.filterAssigned,
  pending: forumText.filterPending,
  flagged: forumText.filterFlagged,
};

/** The label above the list: what it shows, in a few words, e.g. "Meine · Erledigt · Beliebt". */
export const describeFilters = (filters: ForumFilters, locale: Locale): string =>
  [
    filters.filter === 'all' ? undefined : listFilterText[filters.filter][locale],
    filters.status === 'done' ? forumText.done[locale] : undefined,
    filters.sort === 'popular' ? forumText.popular[locale] : forumText.newest[locale],
  ]
    .filter((part) => part !== undefined)
    .join(' · ');

const Segmented = <T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (value: T) => void;
}): React.JSX.Element => (
  <div className={segmentedTrackClassName}>
    {options.map(([option, text]) => (
      <button
        key={option}
        type="button"
        aria-pressed={value === option}
        onClick={() => onChange(option)}
        className={cn(segmentClassName(value === option), 'flex-1 text-[14px] font-semibold')}
      >
        {text}
      </button>
    ))}
  </div>
);

/**
 * The feed's filters in the shared sheet, so the feed itself is the search, the topics and the
 * posts. "Meine Aufträge", "Zur Freigabe" and "Gemeldet" are offered only to whom they
 * can show something.
 */
export const ForumFilterSheet: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchor: React.RefObject<HTMLElement | null>;
  filters: ForumFilters;
  onChange: (filters: ForumFilters) => void;
  offered: readonly ForumListFilter[];
  locale: Locale;
}> = ({ open, onOpenChange, anchor, filters, onChange, offered, locale }) => (
  <BottomSheet
    open={open}
    onOpenChange={onOpenChange}
    title={forumText.filterTitle[locale]}
    anchor={anchor}
    footer={
      isFiltered(filters) ? (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_FORUM_FILTERS)}
          className="bg-quiet hover:bg-chip focus-visible:focus-surface h-11 w-full cursor-pointer rounded-xl text-[15px] font-semibold text-green-900"
        >
          {forumText.resetFilters[locale]}
        </button>
      ) : undefined
    }
  >
    <div className="flex flex-col gap-4 pb-2">
      <section className="flex flex-col gap-2">
        <SectionLabel as="h3">{forumText.status[locale]}</SectionLabel>
        <Segmented
          value={filters.status}
          options={[
            ['active', forumText.active[locale]],
            ['done', forumText.done[locale]],
          ]}
          onChange={(status) => onChange({ ...filters, status })}
        />
      </section>
      <section className="flex flex-col gap-2">
        <SectionLabel as="h3">{forumText.show[locale]}</SectionLabel>
        <ul className="border-line divide-line divide-y overflow-hidden rounded-[14px] border bg-white">
          {offered.map((option) => (
            <li key={option}>
              <button
                type="button"
                aria-pressed={filters.filter === option}
                onClick={() => onChange({ ...filters, filter: option })}
                className="focus-visible:focus-surface hover:bg-quiet flex min-h-12 w-full cursor-pointer items-center px-4 text-left text-[15px] font-semibold text-green-900"
              >
                <span className="flex-1">{listFilterText[option][locale]}</span>
                {filters.filter === option && (
                  <CheckCircle2 className="text-conveniat-green h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-2">
        <SectionLabel as="h3">{forumText.sortBy[locale]}</SectionLabel>
        <Segmented
          value={filters.sort}
          options={[
            ['new', forumText.newest[locale]],
            ['popular', forumText.popular[locale]],
          ]}
          onChange={(sort) => onChange({ ...filters, sort })}
        />
      </section>
    </div>
  </BottomSheet>
);
