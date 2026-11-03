'use client';

import { SectionLabel } from '@/components/ui/section-label';
import { segmentClassName, segmentedTrackClassName } from '@/components/ui/segmented-control';
import { SkeletonBar } from '@/features/payload-cms/components/search/search-skeleton';
import {
  periodLabel,
  periodLabels,
  sortLabel,
  sortLabels,
  typeFilterLabel,
  typeLabels,
} from '@/features/payload-cms/components/search/search-translations';
import type {
  SearchPeriod,
  SearchResultType,
  SearchSort,
} from '@/features/payload-cms/search/search-types';
import {
  SEARCH_PERIODS,
  SEARCH_RESULT_TYPES,
  SEARCH_SORTS,
} from '@/features/payload-cms/search/search-types';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Check } from 'lucide-react';
import type React from 'react';

export interface SearchFilters {
  types: SearchResultType[];
  sort: SearchSort;
  period: SearchPeriod;
}

/** A small square chip, filled brand green while chosen. */
export const filterChipClassName = (isChosen: boolean): string =>
  cn(
    'inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-[14px] font-semibold whitespace-nowrap transition-colors lg:h-9',
    'disabled:cursor-default disabled:opacity-45',
    isChosen ? 'bg-conveniat-green text-white' : 'bg-chip text-green-900 hover:bg-tint-line',
  );

const periodText = (period: SearchPeriod, locale: Locale): string =>
  period === 'year'
    ? new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Europe/Zurich' }).format(
        new Date(),
      )
    : periodLabels[period][locale];

/**
 * The filters of the search: which types, in which order, and how recent. The same panel sits
 * beside the results on a wide screen and in the bottom sheet on a phone.
 */
export const SearchFilterPanel: React.FC<{
  filters: SearchFilters;
  /** undefined while the counts of the current query are on their way */
  counts: Record<SearchResultType, number> | undefined;
  locale: Locale;
  onChange: (filters: Partial<SearchFilters>) => void;
}> = ({ filters, counts, locale, onChange }) => {
  const toggleType = (type: SearchResultType): void => {
    const types = filters.types.includes(type)
      ? filters.types.filter((chosen) => chosen !== type)
      : [...filters.types, type];
    // every type chosen is the same search as none chosen, and keeps the URL short
    onChange({ types: types.length === SEARCH_RESULT_TYPES.length ? [] : types });
  };

  return (
    <div className="flex flex-col">
      <SectionLabel as="h3">{typeFilterLabel[locale]}</SectionLabel>
      <ul className="divide-line mt-2 flex flex-col divide-y">
        {SEARCH_RESULT_TYPES.map((type) => {
          const isChecked = filters.types.includes(type);
          const isEmpty = counts?.[type] === 0 && !isChecked;
          return (
            <li key={type}>
              <label
                className={cn(
                  'text-heading flex min-h-11 cursor-pointer items-center gap-3 text-[15px] font-semibold',
                  isEmpty && 'cursor-default opacity-45',
                )}
              >
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={isChecked}
                  disabled={isEmpty}
                  onChange={() => toggleType(type)}
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    'peer-focus-visible:ring-conveniat-green flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2',
                    isChecked
                      ? 'border-conveniat-green bg-conveniat-green text-white'
                      : 'border-rail bg-white',
                  )}
                >
                  {isChecked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <span className="flex-1">{typeLabels[type][locale]}</span>
                {counts === undefined ? (
                  <SkeletonBar className="h-3.5 w-4" />
                ) : (
                  <span className="text-[14px] font-medium text-green-500">{counts[type]}</span>
                )}
              </label>
            </li>
          );
        })}
      </ul>

      <SectionLabel as="h3" className="mt-6">
        {sortLabel[locale]}
      </SectionLabel>
      <div className={cn(segmentedTrackClassName, 'mt-2 w-fit')}>
        {SEARCH_SORTS.map((sort) => (
          <button
            key={sort}
            type="button"
            aria-pressed={filters.sort === sort}
            onClick={() => onChange({ sort })}
            className={cn(
              segmentClassName(filters.sort === sort),
              'px-4 text-[14px] font-semibold',
            )}
          >
            {sortLabels[sort][locale]}
          </button>
        ))}
      </div>

      <SectionLabel as="h3" className="mt-6">
        {periodLabel[locale]}
      </SectionLabel>
      <div className="mt-2 flex flex-wrap gap-2">
        {SEARCH_PERIODS.map((period) => (
          <button
            key={period}
            type="button"
            aria-pressed={filters.period === period}
            onClick={() => onChange({ period })}
            className={filterChipClassName(filters.period === period)}
          >
            {periodText(period, locale)}
          </button>
        ))}
      </div>
    </div>
  );
};
