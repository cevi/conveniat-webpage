'use client';

import { AppSearchBar } from '@/components/ui/app-search-bar';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button, buttonVariants } from '@/components/ui/buttons/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LinkComponent } from '@/components/ui/link-component';
import type { SearchFilters } from '@/features/payload-cms/components/search/search-filter-panel';
import {
  filterChipClassName,
  SearchFilterPanel,
} from '@/features/payload-cms/components/search/search-filter-panel';
import { SearchPreview } from '@/features/payload-cms/components/search/search-preview';
import { SearchResultRow } from '@/features/payload-cms/components/search/search-result-row';
import {
  allTypesLabel,
  alsoFoundLabel,
  filterLabel,
  nextPageLabel,
  noQueryDescription,
  noQueryTitle,
  noResultsDescription,
  noResultsTitle,
  noResultsWithFiltersDescription,
  pageOfLabel,
  previousPageLabel,
  resetFiltersLabel,
  resultCountLabel,
  searchPageTitle,
  searchPlaceholder,
  showAllLabel,
  showResultsLabel,
  typeLabels,
  typeLabelSingular,
} from '@/features/payload-cms/components/search/search-translations';
import { parseSearchWords } from '@/features/payload-cms/search/search-text';
import type {
  SearchResult,
  SearchResultType,
  SiteSearchResponse,
} from '@/features/payload-cms/search/search-types';
import {
  buildSearchQueryString,
  SEARCH_RESULT_TYPES,
} from '@/features/payload-cms/search/search-types';
import { useIsDesktop } from '@/hooks/use-is-desktop';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ChevronLeft, ChevronRight, Search, SearchX, SlidersHorizontal } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import type React from 'react';
import { useRef, useState, useTransition } from 'react';

const DEFAULT_FILTERS: SearchFilters = { types: [], sort: 'relevance', period: 'any' };

/** "4 Seiten, 2 News": what the chosen types leave out, so nothing found goes unseen. */
const AlsoFound: React.FC<{
  counts: Record<SearchResultType, number>;
  chosenTypes: SearchResultType[];
  locale: Locale;
  onShowAll: () => void;
}> = ({ counts, chosenTypes, locale, onShowAll }) => {
  if (chosenTypes.length === 0) return;
  const others = SEARCH_RESULT_TYPES.filter(
    (type) => !chosenTypes.includes(type) && counts[type] > 0,
  );
  if (others.length === 0) return;
  return (
    <div className="bg-quiet mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[14px] px-4 py-2 text-[14px] text-green-700">
      <Search className="h-4 w-4 shrink-0 text-green-500" aria-hidden="true" />
      <span>{alsoFoundLabel[locale]}</span>
      <span className="text-heading font-semibold">
        {others
          .map(
            (type) =>
              `${counts[type]} ${(counts[type] === 1 ? typeLabelSingular : typeLabels)[type][locale]}`,
          )
          .join(', ')}
      </span>
      <button
        type="button"
        onClick={onShowAll}
        className="text-conveniat-green ml-auto flex min-h-11 cursor-pointer items-center gap-0.5 font-semibold"
      >
        {showAllLabel[locale]}
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
};

/** The type chips on a phone, where the panel with the checkboxes sits in a sheet. */
const TypeChips: React.FC<{
  filters: SearchFilters;
  counts: Record<SearchResultType, number>;
  locale: Locale;
  onChange: (filters: Partial<SearchFilters>) => void;
}> = ({ filters, counts, locale, onChange }) => {
  const total = SEARCH_RESULT_TYPES.reduce((sum, type) => sum + counts[type], 0);
  return (
    <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
      <button
        type="button"
        aria-pressed={filters.types.length === 0}
        onClick={() => onChange({ types: [] })}
        className={cn(filterChipClassName(filters.types.length === 0), 'snap-start')}
      >
        {allTypesLabel[locale]} <span className="text-[12px] opacity-75">{total}</span>
      </button>
      {SEARCH_RESULT_TYPES.map((type) => {
        const isChosen = filters.types.includes(type);
        return (
          <button
            key={type}
            type="button"
            aria-pressed={isChosen}
            disabled={counts[type] === 0 && !isChosen}
            onClick={() =>
              onChange({
                types: isChosen
                  ? filters.types.filter((chosen) => chosen !== type)
                  : [...filters.types, type],
              })
            }
            className={cn(filterChipClassName(isChosen), 'snap-start')}
          >
            {typeLabels[type][locale]}{' '}
            <span className="text-[12px] opacity-75">{counts[type]}</span>
          </button>
        );
      })}
    </div>
  );
};

const Pagination: React.FC<{
  page: number;
  totalPages: number;
  locale: Locale;
  hrefOf: (page: number) => string;
}> = ({ page, totalPages, locale, hrefOf }) => {
  if (totalPages <= 1) return;
  return (
    <nav className="mt-6 flex items-center justify-between gap-3">
      {page > 1 ? (
        <LinkComponent
          href={hrefOf(page - 1)}
          className={buttonVariants({ variant: 'outlined', size: 'touch' })}
        >
          <ChevronLeft aria-hidden="true" />
          {previousPageLabel[locale]}
        </LinkComponent>
      ) : (
        <span />
      )}
      <span className="text-[14px] text-green-700">{pageOfLabel(page, totalPages)[locale]}</span>
      {page < totalPages ? (
        <LinkComponent
          href={hrefOf(page + 1)}
          className={buttonVariants({ variant: 'outlined', size: 'touch' })}
        >
          {nextPageLabel[locale]}
          <ChevronRight aria-hidden="true" />
        </LinkComponent>
      ) : (
        <span />
      )}
    </nav>
  );
};

/**
 * The search page: the query, the filters beside the results on a wide screen or in a sheet on
 * a phone, the results, and from `xl` on a preview of the chosen one. The filters live in the
 * URL, so a search can be shared and the back button undoes a filter.
 */
export const SearchResultsView: React.FC<{
  locale: Locale;
  query: string;
  filters: SearchFilters;
  response: SiteSearchResponse;
}> = ({ locale, query, filters, response }) => {
  const router = useRouter();
  const pathname = usePathname();
  const isDesktop = useIsDesktop();
  const [isPending, startTransition] = useTransition();
  const [draftQuery, setDraftQuery] = useState(query);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | undefined>();
  const [isPreviewClosed, setIsPreviewClosed] = useState(false);
  const filterButtonReference = useRef<HTMLButtonElement>(null);

  const words = parseSearchWords(query);
  const { results, counts } = response;
  const selected: SearchResult | undefined =
    results.find((result) => result.key === selectedKey) ?? results.at(0);
  const showPreview = isDesktop && !isPreviewClosed && selected !== undefined;
  const hasFilters =
    filters.types.length > 0 ||
    filters.sort !== DEFAULT_FILTERS.sort ||
    filters.period !== DEFAULT_FILTERS.period;
  const sheetFilterCount =
    (filters.sort === DEFAULT_FILTERS.sort ? 0 : 1) +
    (filters.period === DEFAULT_FILTERS.period ? 0 : 1);

  const hrefOf = (options: Partial<SearchFilters> & { query?: string; page?: number }): string =>
    `${pathname}?${buildSearchQueryString({ ...filters, query, page: 1, ...options })}`;

  const applyFilters = (change: Partial<SearchFilters>): void => {
    startTransition(() => router.replace(hrefOf(change), { scroll: false }));
  };

  const submitQuery = (event: React.SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const trimmed = draftQuery.trim();
    if (trimmed === '' || trimmed === query) return;
    setSelectedKey(undefined);
    startTransition(() => router.push(hrefOf({ query: trimmed })));
  };

  const selectResult = (result: SearchResult): void => {
    setSelectedKey(result.key);
    setIsPreviewClosed(false);
  };

  const filterPanel = (
    <SearchFilterPanel filters={filters} counts={counts} locale={locale} onChange={applyFilters} />
  );

  return (
    <div className="mx-auto w-full max-w-[1680px] px-4 pt-6 pb-16 sm:px-6 xl:px-10">
      <div
        className={cn(
          'lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10',
          showPreview &&
            'xl:grid-cols-[220px_minmax(0,1fr)_minmax(400px,460px)] 2xl:grid-cols-[240px_minmax(0,1fr)_540px]',
        )}
      >
        <aside className="hidden lg:block">
          <div className="sticky top-24 pt-[76px]">{query !== '' && filterPanel}</div>
        </aside>

        <main className="min-w-0">
          <form onSubmit={submitQuery} role="search">
            <AppSearchBar
              onPage
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              onClear={() => setDraftQuery('')}
              placeholder={searchPlaceholder[locale]}
              autoFocus={query === ''}
            />
          </form>

          {query === '' ? (
            <EmptyState
              icon={Search}
              title={noQueryTitle[locale]}
              description={noQueryDescription[locale]}
            />
          ) : (
            <>
              <div className="mt-5 flex items-center gap-3">
                <h1 className="font-heading text-heading min-w-0 flex-1 text-[22px] leading-tight font-extrabold lg:text-[28px]">
                  {response.total === 0 && !hasFilters
                    ? searchPageTitle[locale]
                    : resultCountLabel(response.total, query)[locale]}
                </h1>
                <Button
                  ref={filterButtonReference}
                  type="button"
                  variant="quiet"
                  size="touchIcon"
                  aria-label={filterLabel[locale]}
                  onClick={() => setIsFilterSheetOpen(true)}
                  className="relative lg:hidden"
                >
                  <SlidersHorizontal aria-hidden="true" />
                  {sheetFilterCount > 0 && (
                    <span className="bg-conveniat-green absolute -top-1 -right-1 rounded-full px-1.5 text-[11px] font-bold text-white">
                      {sheetFilterCount}
                    </span>
                  )}
                </Button>
              </div>

              <div className="mt-3 lg:hidden">
                <TypeChips
                  filters={filters}
                  counts={counts}
                  locale={locale}
                  onChange={applyFilters}
                />
              </div>

              {results.length === 0 ? (
                <EmptyState
                  icon={SearchX}
                  title={noResultsTitle[locale]}
                  description={
                    hasFilters
                      ? noResultsWithFiltersDescription[locale]
                      : noResultsDescription[locale]
                  }
                  action={
                    hasFilters ? (
                      <Button
                        variant="outlined"
                        size="touch"
                        onClick={() => applyFilters(DEFAULT_FILTERS)}
                      >
                        {resetFiltersLabel[locale]}
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <Card
                  as="ul"
                  divided
                  className={cn('mt-4 transition-opacity', isPending && 'opacity-60')}
                >
                  {results.map((result) => (
                    <SearchResultRow
                      key={result.key}
                      result={result}
                      words={words}
                      locale={locale}
                      isSelected={showPreview && result.key === selected.key}
                      onSelect={isDesktop ? selectResult : undefined}
                    />
                  ))}
                </Card>
              )}

              <AlsoFound
                counts={counts}
                chosenTypes={filters.types}
                locale={locale}
                onShowAll={() => applyFilters({ types: [] })}
              />
              <Pagination
                page={response.page}
                totalPages={response.totalPages}
                locale={locale}
                hrefOf={(page) => hrefOf({ page })}
              />
            </>
          )}
        </main>

        {showPreview && (
          <aside className="hidden xl:block">
            <Card className="sticky top-24 mt-[76px] max-h-[calc(100dvh-7rem)] overflow-y-auto p-6">
              <SearchPreview
                key={selected.key}
                result={selected}
                words={words}
                locale={locale}
                onClose={() => setIsPreviewClosed(true)}
              />
            </Card>
          </aside>
        )}
      </div>

      <BottomSheet
        open={isFilterSheetOpen}
        onOpenChange={setIsFilterSheetOpen}
        title={filterLabel[locale]}
        anchor={filterButtonReference}
        footer={
          <Button
            variant="primary"
            size="touch"
            className="w-full"
            onClick={() => setIsFilterSheetOpen(false)}
          >
            {showResultsLabel(response.total)[locale]}
          </Button>
        }
      >
        {filterPanel}
      </BottomSheet>
    </div>
  );
};
